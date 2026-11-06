import type { RegistrationProfile } from '../data/registration-profile';
import type { AccountLedger, Credentials } from '../fixtures/accounts';
import { performAndAwaitResponse, performAndCaptureResponse } from '../interactions/network';
import type { App } from '../pages/app';

/**
 * Primer paso del registro: nombre y correo.
 * Respuesta observada en el análisis: `POST /signup` → 200 con el formulario del paso 2.
 */
export async function startSignup(session: App, profile: RegistrationProfile): Promise<void> {
  await session.signupLogin.open();
  await performAndAwaitResponse(
    session.page,
    { method: 'POST', path: '/signup', status: 200 },
    () => session.signupLogin.startSignup(profile.name, profile.email),
  );
}

/**
 * Segundo paso del registro: rellena y envía la información de la cuenta.
 * El intento se registra en el ledger ANTES de enviar, para que la limpieza lo trate
 * aunque el envío falle. Respuesta observada: `POST /signup` → 302 a `/account_created`.
 */
export async function completeAccountInformation(
  session: App,
  profile: RegistrationProfile,
  accounts: AccountLedger,
): Promise<void> {
  await session.accountInformation.fill(profile);
  accounts.recordCreationAttempt(profile);
  await performAndAwaitResponse(
    session.page,
    { method: 'POST', path: '/signup', status: 302 },
    () => session.accountInformation.submit(),
  );
  accounts.recordCreated(profile.email);
}

/**
 * Objetivo de negocio: tener una cuenta registrada con la sesión iniciada.
 * Reutiliza los dos pasos del registro y confirma con "Continue".
 */
export async function registerAccount(
  session: App,
  profile: RegistrationProfile,
  accounts: AccountLedger,
): Promise<void> {
  await startSignup(session, profile);
  await completeAccountInformation(session, profile, accounts);
  await session.accountConfirmation.continue();
  await session.header.loggedInAs.waitFor();
}

export type LoginOutcome = 'accepted' | 'rejected';

/**
 * Intenta iniciar sesión y devuelve el resultado según la respuesta observada:
 * `POST /login` → 302 (aceptado) o 200 con el formulario de nuevo (rechazado).
 */
export async function logIn(session: App, credentials: Credentials): Promise<LoginOutcome> {
  await session.signupLogin.open();
  const response = await performAndCaptureResponse(
    session.page,
    { method: 'POST', path: '/login' },
    () => session.signupLogin.submitLogin(credentials.email, credentials.password),
  );
  if (response.status() === 302) return 'accepted';
  if (response.status() === 200) return 'rejected';
  throw new Error(`POST /login respondió ${String(response.status())}; se esperaba 302 o 200`);
}

/**
 * Elimina la cuenta de la sesión con el mecanismo oficial ("Delete Account").
 * Respuesta observada: `GET /delete_account` → 200 con "Account Deleted!".
 */
export async function deleteAccount(session: App): Promise<void> {
  await performAndAwaitResponse(
    session.page,
    { method: 'GET', path: '/delete_account', status: 200 },
    () => session.header.deleteAccount(),
  );
  await session.accountConfirmation.accountDeleted.waitFor();
}

/**
 * Objetivo de negocio: el usuario elimina su propia cuenta. Además de eliminarla,
 * actualiza el ledger para que el teardown solo verifique (y no intente eliminarla otra vez).
 */
export async function deleteRegisteredAccount(
  session: App,
  accounts: AccountLedger,
  email: string,
): Promise<void> {
  accounts.recordDeletionAttempt(email);
  await deleteAccount(session);
  accounts.recordDeleted(email);
}
