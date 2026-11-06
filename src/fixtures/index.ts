import type { TestInfo } from '@playwright/test';
import { createBdd, test as base } from 'playwright-bdd';
import { loadEnv } from '../config/env';
import { PROJECTS } from '../config/projects';
import { type AppRequest, NetworkGuards } from '../interactions/network-guards';
import { App } from '../pages/app';
import { interceptedPayments } from '../questions/payment.questions';
import { readSharedAccount, SHARED_SESSION_STATE } from '../setup/shared-session';
import { AccountLedger } from './accounts';
import { BrowserSessions } from './browser-sessions';
import { ScenarioContext } from './scenario-context';
import { SyntheticData } from './synthetic-data';

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
  /** Contextos de navegador adicionales, protegidos con los mismos guards. */
  browserSessions: BrowserSessions;
  /** Datos sintéticos deterministas del test. */
  syntheticData: SyntheticData;
  /** Ciclo de vida de las cuentas creadas por el test: se eliminan y verifican al terminar. */
  accounts: AccountLedger;
  /** Nombre y correo de la cuenta compartida (`@shared-session`). Nunca la contraseña. */
  sharedAccount: { readonly name: string; readonly email: string };
}

const SHARED_SESSION_TAG = '@shared-session';

function isSharedSession(tags: readonly string[]): boolean {
  return tags.includes(SHARED_SESSION_TAG);
}

/**
 * En un escenario de solo lectura, cualquier operación de estado bloqueada hace fallar
 * el test. Si el test ya falló, se anota sin sustituir su error original.
 */
function failOnBlockedStateChanges(blocked: readonly AppRequest[], testInfo: TestInfo): void {
  if (blocked.length === 0) return;
  const summary = blocked.map((request) => `${request.method} ${request.path}`).join(', ');
  if (testInfo.status === testInfo.expectedStatus) {
    throw new Error(`Operación de estado bloqueada en un escenario de solo lectura: ${summary}`);
  }
  testInfo.annotations.push({ type: 'blocked-state-change', description: summary });
}

/** Margen propio de la limpieza de cuentas: login, eliminación y verificación por cuenta. */
const ACCOUNT_CLEANUP_TIMEOUT_MS = 90_000;

/**
 * Test base del framework. Todo fixture tiene alcance de test: cada escenario
 * recibe su propio contexto de navegador, Page Objects, datos y memoria.
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
  // La sesión compartida solo se carga en los escenarios @shared-session.
  storageState: async ({ storageState }, use, testInfo) => {
    await use(isSharedSession(testInfo.tags) ? SHARED_SESSION_STATE : storageState);
  },

  networkGuards: [
    async ({ context, baseURL }, use, testInfo) => {
      if (!baseURL) throw new Error('baseURL no configurada');
      const guards = await NetworkGuards.install(context, baseURL, {
        readOnly: isSharedSession(testInfo.tags),
      });
      await use(guards);
      testInfo.annotations.push({
        type: 'network-guards',
        description: `anuncios/telemetría bloqueados: ${String(guards.blockedRequests)} (${guards.blockedHosts.join(', ') || 'ninguno'}); POST /payment abortados: ${String(guards.paymentRequests.length)}; operaciones de estado bloqueadas: ${String(guards.blockedStateChanges.length)}`,
      });
      if (guards.paymentRequests.length > 0) {
        // Representación saneada: campos y presencia del CSRF, nunca su valor ni el cuerpo original.
        await testInfo.attach('pago-interceptado.json', {
          body: JSON.stringify(
            { requests: interceptedPayments(guards), paymentResponses: guards.paymentResponses },
            null,
            2,
          ),
          contentType: 'application/json',
        });
      }
      failOnBlockedStateChanges(guards.blockedStateChanges, testInfo);
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

  browserSessions: async ({ browser, baseURL }, use, testInfo) => {
    if (!baseURL) throw new Error('baseURL no configurada');
    const sessions = new BrowserSessions(browser, baseURL, {
      readOnly: isSharedSession(testInfo.tags),
    });
    await use(sessions);
    await sessions.closeAll();
    failOnBlockedStateChanges(sessions.blockedStateChanges(), testInfo);
  },

  // Playwright exige desestructurar el primer argumento del fixture aunque no se use.
  sharedAccount: async ({}, use) => {
    const record = readSharedAccount();
    if (!record) throw new Error('No hay sesión compartida: el proyecto setup no la creó');
    await use({ name: record.name, email: record.email });
  },

  syntheticData: async ({}, use, testInfo) => {
    if (!env.runId) throw new Error('TEST_RUN_ID no definido: playwright.config.ts debe fijarlo');
    const data = new SyntheticData({
      runId: env.runId,
      testId: testInfo.testId,
      retry: testInfo.retry,
      repeatEachIndex: testInfo.repeatEachIndex,
    });
    await use(data);
    if (data.generated.length > 0) {
      // Sin contraseñas: el perfil adjunto está censurado y la contraseña no depende de la semilla.
      await testInfo.attach('datos-sinteticos.json', {
        body: JSON.stringify(data.generated, null, 2),
        contentType: 'application/json',
      });
    }
  },

  accounts: [
    async ({ browserSessions }, use, testInfo) => {
      const ledger = new AccountLedger();
      await use(ledger);

      // Semántica finally: se ejecuta aunque el escenario haya fallado.
      await ledger.cleanUp(browserSessions);
      const inventory = ledger.inventory();
      if (inventory.length === 0) return;
      await testInfo.attach('inventario-cuentas.json', {
        body: JSON.stringify(inventory, null, 2),
        contentType: 'application/json',
      });

      const failures = inventory.filter((entry) => entry.state === 'cleanup_failed');
      if (failures.length === 0) return;
      const summary = failures
        .map((entry) => `${entry.email}: ${entry.detail ?? 'sin detalle'}`)
        .join('; ');
      if (testInfo.status === testInfo.expectedStatus) {
        // El escenario pasó: la limpieza fallida no puede quedar oculta.
        throw new Error(`Limpieza de cuentas fallida: ${summary}`);
      }
      // El escenario ya falló: se conserva su error y se añade el de la limpieza.
      testInfo.annotations.push({ type: 'cleanup-error', description: summary });
    },
    { timeout: ACCOUNT_CLEANUP_TIMEOUT_MS },
  ],
});

export const { Given, When, Then } = createBdd(test);
