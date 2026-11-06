import { test } from '../fixtures/index';
import {
  ledgerFor,
  readSharedAccount,
  recoverableState,
  removeSharedSessionFiles,
  writeSharedAccount,
} from './shared-session';

/**
 * Proyecto `cleanup` (teardown de `setup`): elimina y verifica la cuenta compartida.
 * Los archivos de `.auth/` solo se borran si la cuenta quedó verificada como eliminada;
 * si no, se conservan con el último estado para poder completar la limpieza.
 */
test('eliminar la sesión compartida', async ({ browserSessions }) => {
  const record = readSharedAccount();
  if (!record) {
    test.info().annotations.push({
      type: 'shared-session',
      description: 'no hay cuenta compartida pendiente de eliminar',
    });
    return;
  }

  const ledger = ledgerFor(record);
  await ledger.cleanUp(browserSessions);
  const inventory = ledger.inventory();
  await test.info().attach('inventario-cuenta-compartida.json', {
    body: JSON.stringify(inventory, null, 2),
    contentType: 'application/json',
  });

  const entry = inventory[0];
  if (entry && (entry.state === 'verified' || entry.state === 'not_created')) {
    removeSharedSessionFiles();
    return;
  }

  const lastState = recoverableState(entry?.lastConfirmedState, record.state);
  writeSharedAccount({ ...record, state: lastState, detail: entry?.detail });
  throw new Error(
    `No se pudo eliminar y verificar la cuenta compartida ${record.email} (último estado: ${lastState}). ` +
      'Las credenciales se conservan en .auth/ para completar la limpieza.',
  );
});
