/**
 * Límites de espera por acción y por navegación. Playwright no limita las acciones por
 * defecto: sin esto, una página inesperada (por ejemplo, la página de sobrecarga
 * "This website is under heavy load") deja una acción esperando hasta el timeout del test.
 * Se aplican en playwright.config.ts y en los contextos de `browserSessions`.
 */
export const ACTION_TIMEOUT_MS = 15_000;
export const NAVIGATION_TIMEOUT_MS = 30_000;

/**
 * Timeout por test. Los escenarios E2E encadenan registro, varias navegaciones y un
 * segundo contexto sobre una aplicación pública lenta; 30 s (valor por defecto) no basta.
 */
export const TEST_TIMEOUT_MS = 60_000;
