import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { defineBddProject } from 'playwright-bdd';
import { ensureRunId, loadEnv } from './src/config/env';
import { PROJECTS } from './src/config/projects';
import { ACTION_TIMEOUT_MS, NAVIGATION_TIMEOUT_MS } from './src/config/timeouts';
import { ALLURE_RESULTS_DIR } from './src/support/reset-allure-results';

ensureRunId();
const env = loadEnv();

/** Opciones BDD comunes a todos los proyectos. */
const bdd = {
  features: 'features/**/*.feature',
  language: 'es',
  missingSteps: 'fail-on-gen',
} as const;

/** Los pasos comunes y los fixtures se cargan en todos los proyectos. */
const commonSteps = ['src/fixtures/index.ts', 'steps/common/**/*.ts'];

const functional = defineBddProject({
  ...bdd,
  name: PROJECTS.functional,
  steps: commonSteps,
  tags: 'not @ai',
});

/** Solo el proyecto `ai` carga `steps/ai`: la suite funcional no importa código de IA. */
const ai = defineBddProject({
  ...bdd,
  name: PROJECTS.ai,
  steps: [...commonSteps, 'steps/ai/**/*.ts'],
  tags: '@ai',
});

generateBddTests();

export default defineConfig({
  outputDir: 'test-results',
  globalSetup: './src/support/reset-allure-results.ts',
  fullyParallel: true,
  forbidOnly: env.profile.forbidOnly,
  workers: env.profile.workers,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['allure-playwright', { resultsDir: ALLURE_RESULTS_DIR }],
  ],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: env.baseURL,
    testIdAttribute: 'data-qa',
    actionTimeout: ACTION_TIMEOUT_MS,
    navigationTimeout: NAVIGATION_TIMEOUT_MS,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { ...functional, retries: env.profile.retries },
    // Sin reintentos: la variabilidad del modelo debe quedar visible.
    { ...ai, retries: 0 },
  ],
});

/**
 * Genera los tests de playwright-bdd antes de que Playwright los busque, para que
 * `npx playwright test`, `--ui` y `--list` funcionen sin ejecutar `bddgen` a mano.
 * Solo se ejecuta en el proceso principal: ni en los workers de Playwright
 * (TEST_WORKER_INDEX) ni dentro del propio bddgen (PLAYWRIGHT_BDD_GEN), que vuelve
 * a cargar este archivo.
 */
function generateBddTests(): void {
  if (process.env.TEST_WORKER_INDEX || process.env.PLAYWRIGHT_BDD_GEN) return;

  const require = createRequire(import.meta.url);
  const bddPackage = require.resolve('playwright-bdd/package.json');
  const bddgen = path.join(path.dirname(bddPackage), 'dist', 'cli', 'index.js');
  execFileSync(process.execPath, [bddgen, ...configArgs()], { stdio: 'inherit' });
}

/** Reenvía `--config`/`-c` a bddgen si Playwright se invocó con una configuración explícita. */
function configArgs(): string[] {
  const args = process.argv;
  const index = args.findIndex((arg) => arg === '--config' || arg === '-c');
  const value = index >= 0 ? args[index + 1] : undefined;
  if (value) return ['--config', value];
  const inline = args.find((arg) => arg.startsWith('--config='));
  return inline ? [inline] : [];
}
