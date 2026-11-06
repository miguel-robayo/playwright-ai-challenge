import { rmSync } from 'node:fs';
import path from 'node:path';

/** Directorio de resultados de allure-playwright, compartido con playwright.config.ts. */
export const ALLURE_RESULTS_DIR = 'allure-results';

/**
 * Global setup de Playwright: vacía los resultados de Allure de la ejecución anterior.
 * allure-playwright no limpia el directorio, y sin esto el reporte mezclaría ejecuciones.
 * Playwright no lo ejecuta con `--list`.
 */
export default function resetAllureResults(): void {
  rmSync(path.resolve(ALLURE_RESULTS_DIR), { recursive: true, force: true });
}
