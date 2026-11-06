import type { AccountLedger } from '../../src/fixtures/accounts';
import type { ScenarioContext } from '../../src/fixtures/scenario-context';
import type { SyntheticData } from '../../src/fixtures/synthetic-data';
import type { App } from '../../src/pages/app';
import { registerAccount } from '../../src/tasks/account.tasks';

/**
 * Precondición compartida por varios pasos `Dado`: un usuario con una cuenta propia,
 * registrada y con la sesión iniciada. La cuenta queda en el ledger para su limpieza.
 */
export async function registerIsolatedUser(fixtures: {
  app: App;
  scenario: ScenarioContext;
  syntheticData: SyntheticData;
  accounts: AccountLedger;
}): Promise<void> {
  const profile = fixtures.syntheticData.registrationProfile();
  fixtures.scenario.remember('profile', profile);
  await registerAccount(fixtures.app, profile, fixtures.accounts);
}
