import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { AccountLedger } from '../fixtures/accounts';

/**
 * Sesión compartida para los escenarios `@shared-session` (R-09).
 * Ambos archivos son artefactos locales sensibles: `.auth/` está ignorado por Git y
 * solo se borran cuando la cuenta se eliminó y se verificó (docs/architecture.md, 10.1).
 */
const AUTH_DIR = path.resolve(import.meta.dirname, '..', '..', '.auth');
export const SHARED_SESSION_STATE = path.join(AUTH_DIR, 'shared-session.json');
const SHARED_ACCOUNT_FILE = path.join(AUTH_DIR, 'shared-account.json');

/** Estado confirmado de la cuenta compartida que permite retomar la limpieza. */
const RecoverableState = z.enum(['creation_attempted', 'created', 'deleted']);

const SharedAccountRecord = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(1),
  state: RecoverableState,
  detail: z.string().optional(),
});

export type SharedAccountRecord = z.infer<typeof SharedAccountRecord>;
export type RecoverableAccountState = z.infer<typeof RecoverableState>;

export function writeSharedAccount(record: SharedAccountRecord): void {
  mkdirSync(AUTH_DIR, { recursive: true });
  writeFileSync(SHARED_ACCOUNT_FILE, JSON.stringify(SharedAccountRecord.parse(record), null, 2));
}

export function readSharedAccount(): SharedAccountRecord | undefined {
  if (!existsSync(SHARED_ACCOUNT_FILE)) return undefined;
  return SharedAccountRecord.parse(JSON.parse(readFileSync(SHARED_ACCOUNT_FILE, 'utf8')));
}

/** Borra la sesión y las credenciales. Solo tras verificar que la cuenta ya no existe. */
export function removeSharedSessionFiles(): void {
  rmSync(SHARED_SESSION_STATE, { force: true });
  rmSync(SHARED_ACCOUNT_FILE, { force: true });
}

/** Reconstruye el ledger de la cuenta compartida desde su último estado confirmado. */
export function ledgerFor(record: SharedAccountRecord): AccountLedger {
  const ledger = new AccountLedger();
  ledger.recordCreationAttempt(record);
  if (record.state === 'created' || record.state === 'deleted') ledger.recordCreated(record.email);
  if (record.state === 'deleted') ledger.recordDeleted(record.email);
  return ledger;
}

/** Estado recuperable a partir del inventario tras una limpieza fallida. */
export function recoverableState(
  state: string | undefined,
  fallback: RecoverableAccountState,
): RecoverableAccountState {
  const parsed = RecoverableState.safeParse(state === 'deletion_attempted' ? 'created' : state);
  return parsed.success ? parsed.data : fallback;
}
