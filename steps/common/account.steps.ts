import { expect } from '@playwright/test';
import { Then, When } from '../../src/fixtures/index';
import { deleteRegisteredAccount, logIn } from '../../src/tasks/account.tasks';

When('el usuario elimina la cuenta', async ({ app, scenario, accounts }) => {
  await deleteRegisteredAccount(app, accounts, scenario.recall('profile').email);
});

Then('la confirmación de cuenta eliminada es visible', async ({ app, page }) => {
  await expect(page).toHaveURL(/\/delete_account$/);
  await expect(app.accountConfirmation.accountDeleted).toBeVisible();
  await expect(app.accountConfirmation.accountDeleted).toHaveText(/^account deleted!$/i);
});

Then(
  'el inicio de sesión con las mismas credenciales falla',
  async ({ scenario, browserSessions }) => {
    // Contexto nuevo: la comprobación no depende de la sesión que eliminó la cuenta.
    const session = await browserSessions.open();
    expect(await logIn(session, scenario.recall('profile'))).toBe('rejected');
    await expect(session.signupLogin.loginError).toHaveText('Your email or password is incorrect!');
    await expect(session.header.loggedInAs).toBeHidden();
  },
);
