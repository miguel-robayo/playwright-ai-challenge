import { createBdd, test as base } from 'playwright-bdd';
import { loadEnv } from '../config/env';
import { PROJECTS } from '../config/projects';
import { NetworkGuards } from '../interactions/network-guards';
import { App } from '../pages/app';
import { ScenarioContext } from './scenario-context';

const env = loadEnv();

interface FrameworkFixtures {
  /** Omite los escenarios del proyecto `ai` cuando no hay API key, con el motivo visible en los reportes. */
  aiProjectGuard: undefined;
  /** Guards de red del contexto del test: anuncios y telemetría bloqueados, POST /payment abortado. */
  networkGuards: NetworkGuards;
  /** Page Objects del escenario sobre su `page`. */
  app: App;
  /** Memoria tipada que comparten los pasos de un mismo escenario. */
  scenario: ScenarioContext;
}

/**
 * Test base del framework. Todo fixture tiene alcance de test: cada escenario
 * recibe su propio contexto de navegador, Page Objects y memoria.
 */
export const test = base.extend<FrameworkFixtures>({
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

  // Automático: ningún escenario puede navegar sin los guards, aunque no los pida.
  // Las rutas del contexto también aplican a páginas ya creadas.
  networkGuards: [
    async ({ context, baseURL }, use, testInfo) => {
      if (!baseURL) throw new Error('baseURL no configurada');
      const guards = await NetworkGuards.install(context, baseURL);
      await use(guards);
      testInfo.annotations.push({
        type: 'network-guards',
        description: `anuncios/telemetría bloqueados: ${String(guards.blockedRequests)} (${guards.blockedHosts.join(', ') || 'ninguno'}); POST /payment abortados: ${String(guards.paymentRequests.length)}`,
      });
    },
    { auto: true },
  ],

  app: async ({ page }, use) => {
    await use(new App(page));
  },

  // Playwright exige desestructurar el primer argumento del fixture aunque no se use.
  scenario: async ({}, use) => {
    await use(new ScenarioContext());
  },
});

export const { Given, When, Then } = createBdd(test);
