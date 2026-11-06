import { createBdd, test as base } from 'playwright-bdd';
import { loadEnv } from '../config/env';
import { PROJECTS } from '../config/projects';

const env = loadEnv();

interface FoundationFixtures {
  /** Omite los escenarios del proyecto `ai` cuando no hay API key, con el motivo visible en los reportes. */
  aiProjectGuard: undefined;
}

/**
 * Test base del framework. Los fixtures de las siguientes fases
 * (contextos protegidos, cuentas, datos, evidencias) se añadirán aquí.
 */
export const test = base.extend<FoundationFixtures>({
  aiProjectGuard: [
    // Playwright exige desestructurar el primer argumento del fixture aunque no se use.
    async ({}, use, testInfo) => {
      testInfo.skip(
        testInfo.project.name === PROJECTS.ai && !env.ai.apiKey,
        'AI_API_KEY no configurada',
      );
      await use(undefined);
    },
    { auto: true },
  ],
});

export const { Given, When, Then } = createBdd(test);
