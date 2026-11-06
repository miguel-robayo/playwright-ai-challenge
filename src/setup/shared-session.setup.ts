import { expect } from '@playwright/test';
import { AccountLedger } from '../fixtures/accounts';
import { test } from '../fixtures/index';
import { registerAccount } from '../tasks/account.tasks';
import {
  readSharedAccount,
  recoverableState,
  removeSharedSessionFiles,
  SHARED_SESSION_STATE,
  writeSharedAccount,
} from './shared-session';

/**
 * Proyecto `setup`: crea la cuenta de la sesión compartida y guarda su storageState.
 * Usa su propio ledger (no el fixture `accounts`), porque la cuenta debe sobrevivir
 * al test; la elimina el proyecto `cleanup`.
 */
test('crear la sesión compartida', async ({ app, context, syntheticData, browserSessions }) => {
  // Nunca se sobrescriben las credenciales de una cuenta pendiente de limpieza: se perdería
  // la única forma de recuperarla (por ejemplo, si se ejecuta con --repeat-each).
  const pending = readSharedAccount();
  if (pending) {
    throw new Error(
      `Hay una cuenta compartida pendiente de limpieza (${pending.email}, estado ${pending.state}). ` +
        'Ejecuta el proyecto cleanup antes de crear otra.',
    );
  }
  const profile = syntheticData.registrationProfile();
  const ledger = new AccountLedger();
  // Las credenciales se guardan antes de enviar nada: si algo falla, la cuenta es recuperable.
  writeSharedAccount({ ...profile, state: 'creation_attempted' });

  try {
    await registerAccount(app, profile, ledger);
    writeSharedAccount({ ...profile, state: 'created' });
    // La sesión solo se guarda después de confirmar la autenticación.
    await expect(app.header.loggedInAs).toHaveText(`Logged in as ${profile.name}`);
    await context.storageState({ path: SHARED_SESSION_STATE });
  } catch (error) {
    // Recuperación: se intenta limpiar lo creado sin ocultar el error original.
    await ledger.cleanUp(browserSessions);
    const entry = ledger.inventory()[0];
    if (!entry || entry.state === 'verified' || entry.state === 'not_created') {
      removeSharedSessionFiles();
    } else {
      writeSharedAccount({
        ...profile,
        state: recoverableState(entry.lastConfirmedState, 'creation_attempted'),
        detail: entry.detail,
      });
    }
    test.info().annotations.push({
      type: 'setup-recovery',
      description: entry ? `${entry.email}: ${entry.state}` : 'no llegó a enviarse el registro',
    });
    throw error;
  }
});
