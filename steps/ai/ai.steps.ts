import { expect } from '@playwright/test';
import { AiError } from '../../src/ai/client';
import { evaluateAI, expectAI } from '../../src/ai/expect-ai';
import { generateAiRegistrationProfile } from '../../src/ai/profile-generator';
import { Given, Then, When } from '../../src/fixtures/index';
import { checkoutPromptText } from '../../src/questions/cart.questions';

// --- Aserciones semánticas ---

Then('el aviso de checkout cumple la intención {string}', async ({ app, ai }, intent: string) => {
  // Precondición determinista: el aviso existe antes de evaluarlo semánticamente.
  await expect(app.cart.checkoutPrompt.root).toBeVisible();
  await expectAI(ai, await checkoutPromptText(app), intent);
});

Then(
  'el aviso de checkout no cumple la intención {string}',
  async ({ app, ai }, intent: string) => {
    await expect(app.cart.checkoutPrompt.root).toBeVisible();
    const verdict = await evaluateAI(ai, await checkoutPromptText(app), intent);
    expect(verdict.passed, `motivo del evaluador: ${verdict.reason}`).toBe(false);
  },
);

// --- Datos sintéticos ---

Given(
  'un perfil de usuario generado por IA y validado',
  async ({ ai, scenario, syntheticData }) => {
    const profile = await generateAiRegistrationProfile(ai, {
      email: syntheticData.reserveEmail('qa.ai'),
    });
    syntheticData.recordAiProfile(profile);
    scenario.remember('profile', profile);
  },
);

When(
  'se solicita a la IA un perfil para el país {string}',
  async ({ ai, scenario, syntheticData }, country: string) => {
    try {
      await generateAiRegistrationProfile(ai, {
        email: syntheticData.reserveEmail('qa.ai'),
        country,
      });
    } catch (error) {
      // El rechazo es el resultado esperado; el paso Entonces comprueba que es el correcto.
      if (!(error instanceof AiError)) throw error;
      scenario.remember('aiRejection', error);
    }
  },
);

Then('el perfil se rechaza por las reglas de negocio', ({ scenario }) => {
  // Si la IA hubiera entregado un perfil válido, no habría rechazo y `recall` fallaría.
  const error = scenario.recall('aiRejection');
  expect(error).toBeInstanceOf(AiError);
  expect((error as AiError).kind).toBe('rejected');
  expect(error.message).toContain('country');
});
