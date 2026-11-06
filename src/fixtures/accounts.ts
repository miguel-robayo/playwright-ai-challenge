import { deleteAccount, logIn } from '../tasks/account.tasks';
import type { BrowserSessions } from './browser-sessions';

export interface Credentials {
  readonly name: string;
  readonly email: string;
  readonly password: string;
}

/**
 * Estado de una cuenta creada (o intentada) por un test.
 * - `creation_attempted`: se envió el registro pero no se confirmó la creación.
 * - `not_created`: la limpieza intentó el login y fue rechazado sin que constara la creación.
 */
export type AccountState =
  | 'creation_attempted'
  | 'created'
  | 'deletion_attempted'
  | 'deleted'
  | 'verified'
  | 'not_created'
  | 'cleanup_failed';

/** Entrada del inventario: nunca contiene la contraseña. */
export interface AccountInventoryEntry {
  readonly email: string;
  readonly name: string;
  readonly state: AccountState;
  /** Con `cleanup_failed`: último estado confirmado antes del fallo. */
  readonly lastConfirmedState?: AccountState;
  readonly detail?: string;
}

interface TrackedAccount {
  readonly credentials: Credentials;
  state: AccountState;
  lastConfirmedState?: AccountState;
  detail?: string;
}

const LOGIN_REJECTED_MESSAGE = 'Your email or password is incorrect!';

/**
 * Registro de las cuentas de un test y de su ciclo de vida. Lo crea el fixture
 * `accounts` en cada test; su teardown elimina y verifica todas las cuentas.
 */
export class AccountLedger {
  readonly #accounts = new Map<string, TrackedAccount>();

  recordCreationAttempt(credentials: Credentials): void {
    this.#accounts.set(credentials.email, { credentials, state: 'creation_attempted' });
  }

  recordCreated(email: string): void {
    this.#require(email).state = 'created';
  }

  recordDeletionAttempt(email: string): void {
    this.#require(email).state = 'deletion_attempted';
  }

  recordDeleted(email: string): void {
    this.#require(email).state = 'deleted';
  }

  inventory(): AccountInventoryEntry[] {
    return [...this.#accounts.values()].map(
      ({ credentials, state, lastConfirmedState, detail }) => ({
        email: credentials.email,
        name: credentials.name,
        state,
        ...(lastConfirmedState ? { lastConfirmedState } : {}),
        ...(detail ? { detail } : {}),
      }),
    );
  }

  /**
   * Elimina y verifica cada cuenta pendiente, cada una en contextos nuevos.
   * Nunca lanza: los fallos quedan como `cleanup_failed` en el inventario, con el último
   * estado alcanzado en el detalle (por ejemplo, `deleted` si solo falló la verificación).
   */
  async cleanUp(sessions: BrowserSessions): Promise<void> {
    for (const account of this.#accounts.values()) {
      if (account.state === 'verified' || account.state === 'not_created') continue;
      try {
        await this.#cleanUpOne(account, sessions);
      } catch (error) {
        const reached = account.state;
        account.state = 'cleanup_failed';
        account.lastConfirmedState = reached;
        account.detail = `último estado: ${reached}; ${redact(errorMessage(error), account.credentials.password)}`;
      }
    }
  }

  async #cleanUpOne(account: TrackedAccount, sessions: BrowserSessions): Promise<void> {
    const { credentials } = account;

    if (account.state !== 'deleted') {
      const session = await sessions.open();
      const outcome = await logIn(session, credentials);
      if (outcome === 'rejected') {
        if (account.state === 'creation_attempted') {
          account.state = 'not_created';
          account.detail = 'login rechazado: no consta que la cuenta llegara a crearse';
          return;
        }
        throw new Error(
          'login rechazado para una cuenta creada: no se puede confirmar su eliminación',
        );
      }
      account.state = 'deletion_attempted';
      await deleteAccount(session);
      account.state = 'deleted';
    }

    // Verificación independiente: un contexto nuevo no debe poder iniciar sesión.
    const verifier = await sessions.open();
    if ((await logIn(verifier, credentials)) === 'accepted') {
      throw new Error('la cuenta sigue aceptando el login después de eliminarla');
    }
    await verifier.signupLogin.loginError.filter({ hasText: LOGIN_REJECTED_MESSAGE }).waitFor();
    account.state = 'verified';
  }

  #require(email: string): TrackedAccount {
    const account = this.#accounts.get(email);
    if (!account) throw new Error(`La cuenta ${email} no está registrada en el ledger`);
    return account;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? (error.message.split('\n')[0] ?? error.message) : String(error);
}

/** Garantiza que ningún mensaje de error incluya la contraseña. */
function redact(message: string, password: string): string {
  return message.split(password).join('[REDACTED]');
}
