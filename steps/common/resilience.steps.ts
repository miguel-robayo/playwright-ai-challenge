import { errors, expect } from '@playwright/test';
import { Given, Then, When } from '../../src/fixtures/index';
import { type DomVariant, serveDomVariant } from '../../src/interactions/dom-variants';
import type { App } from '../../src/pages/app';
import { appliedDomVariant } from '../../src/questions/dom-variant.questions';

/** Límite corto para el intento que debe fallar: el fallo esperado no necesita 15 s. */
const EXPECTED_FAILURE_TIMEOUT_MS = 5_000;

async function openLoginVariant(app: App, variant: DomVariant): Promise<void> {
  await serveDomVariant(app.page, '/login', variant);
  await app.signupLogin.open();
  // Precondición: la página muestra de verdad la variante.
  expect(await appliedDomVariant(app)).toBe(variant);
}

Given(
  'la página de login servida con ids, clases y contenedores modificados',
  async ({ app, scenario, syntheticData }) => {
    scenario.remember('profile', syntheticData.registrationProfile());
    await openLoginVariant(app, 'cosmetic');
  },
);

Given(
  'la página de login servida sin atributos data-qa y con los botones renombrados',
  async ({ app, scenario, syntheticData }) => {
    scenario.remember('profile', syntheticData.registrationProfile());
    await openLoginVariant(app, 'contract-removed');
  },
);

When('el usuario rellena el formulario de login', async ({ app, scenario }) => {
  const { email, password } = scenario.recall('profile');
  await app.signupLogin.fillLogin(email, password);
});

When('el usuario intenta rellenar el formulario de login', async ({ app, scenario }) => {
  const { email, password } = scenario.recall('profile');
  try {
    await app.signupLogin.fillLogin(email, password, { timeout: EXPECTED_FAILURE_TIMEOUT_MS });
  } catch (error) {
    // El fallo es el resultado esperado; el paso Entonces decide si es el correcto.
    if (!(error instanceof Error)) throw error;
    scenario.remember('locatorError', error);
  }
});

Then('la interacción se completa', async ({ app, scenario }) => {
  const login = app.signupLogin;
  await expect(login.loginEmailField).toHaveValue(scenario.recall('profile').email);
  // Sin comparar la contraseña: un fallo mostraría su valor.
  await expect(login.loginPasswordField).not.toHaveValue('');
  await expect(login.loginButton).toBeEnabled();
});

Then('el paso falla por timeout del localizador', ({ scenario }) => {
  // Si el localizador hubiera encontrado el campo, no habría error y `recall` fallaría.
  const error = scenario.recall('locatorError');
  expect(error).toBeInstanceOf(errors.TimeoutError);
  expect(error.message).toContain('login-email');
});
