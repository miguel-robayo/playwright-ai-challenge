import { AfterStep } from '../../src/fixtures/index';

/**
 * Evidencia visual del flujo: una captura de la página del escenario después de cada paso
 * Gherkin, adjunta al reporte con el texto del paso. Complementa (no sustituye) las
 * capturas, videos y trazas que Playwright conserva en los fallos (R-11 a R-13).
 * - Los campos de contraseña se enmascaran en la captura.
 * - Se omiten las páginas en blanco (pasos que no usan el navegador) y la página de error
 *   del navegador tras abortar el pago, que se anota en su lugar.
 * - Captura la sesión principal del escenario; las sesiones adicionales no se capturan.
 * - Una captura fallida no hace fallar el escenario: se anota y se continúa.
 */
AfterStep(async ({ page, $step, $testInfo }) => {
  if (page.isClosed() || page.url() === 'about:blank') return;
  if (page.url().startsWith('chrome-error://')) {
    // Tras abortar el POST /payment el navegador queda en su página de error (en blanco):
    // la evidencia útil es `pago-interceptado.json`, no una captura vacía.
    $testInfo.annotations.push({
      type: 'evidence-skipped',
      description: `${$step.title}: página de error del navegador (petición abortada)`,
    });
    return;
  }
  try {
    const body = await page.screenshot({ mask: [page.locator('input[type="password"]')] });
    await $testInfo.attach(`Pantalla: ${$step.title}`, { body, contentType: 'image/png' });
  } catch (error) {
    $testInfo.annotations.push({
      type: 'evidence-skipped',
      description: `${$step.title}: ${error instanceof Error ? (error.message.split('\n')[0] ?? '') : 'error'}`,
    });
  }
});
