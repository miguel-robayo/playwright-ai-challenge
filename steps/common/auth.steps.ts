import { expect } from '@playwright/test';
import { Given, Then, When } from '../../src/fixtures/index';
import {
  completeAccountInformation,
  logIn,
  registerAccount,
  startSignup,
} from '../../src/tasks/account.tasks';

Given('un perfil de usuario sintético único', ({ scenario, syntheticData }) => {
  scenario.remember('profile', syntheticData.registrationProfile());
});

Given('una cuenta sintética registrada', async ({ app, scenario, syntheticData, accounts }) => {
  const profile = syntheticData.registrationProfile();
  scenario.remember('profile', profile);
  await registerAccount(app, profile, accounts);
});

When('el usuario inicia el registro con nombre y correo', async ({ app, scenario }) => {
  await startSignup(app, scenario.recall('profile'));
});

When(
  'el usuario completa los campos obligatorios de la cuenta y la dirección',
  async ({ app, scenario, accounts }) => {
    await completeAccountInformation(app, scenario.recall('profile'), accounts);
  },
);

When('el usuario continúa desde la confirmación', async ({ app }) => {
  await app.accountConfirmation.continue();
});

When(
  'el usuario inicia sesión desde un contexto de navegador nuevo',
  async ({ scenario, browserSessions }) => {
    const session = await browserSessions.open();
    scenario.remember('activeSession', session);
    await logIn(session, scenario.recall('profile'));
  },
);

Then(
  'se muestra el formulario de información de la cuenta con el nombre y el correo rellenados',
  async ({ app, scenario }) => {
    const profile = scenario.recall('profile');
    const form = app.accountInformation;
    await expect(form.heading).toBeVisible();
    await expect(form.nameField).toHaveValue(profile.name);
    await expect(form.emailField).toHaveValue(profile.email);
    await expect(form.emailField).toBeDisabled();
  },
);

Then('la cuenta queda creada', async ({ app, page }) => {
  await expect(page).toHaveURL(/\/account_created$/);
  await expect(app.accountConfirmation.accountCreated).toBeVisible();
  await expect(app.accountConfirmation.accountCreated).toHaveText(/^account created!$/i);
});

Then('el usuario ha iniciado sesión con el nombre generado', async ({ app, scenario }) => {
  const session = scenario.recallOr('activeSession', app);
  const { name } = scenario.recall('profile');
  await expect(session.header.loggedInAs).toHaveText(`Logged in as ${name}`);
  await expect(session.header.logoutLink).toBeVisible();
  await expect(session.header.signupLoginLink).toBeHidden();
});
