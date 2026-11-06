import type { Locator } from '@playwright/test';

/**
 * Rellena un campo con un valor secreto (contraseña) sin que aparezca en los títulos
 * de los pasos. `locator.fill(valor)` se reporta como `Fill "valor"` en el reporte HTML
 * y en Allure; esta función se reporta como `Evaluate`.
 * Dispara `input` y `change` como lo haría el usuario: los formularios de la aplicación
 * son HTML sin frameworks y no necesitan más eventos.
 * Limitación: las trazas de Playwright siguen registrando el valor (instantáneas del DOM
 * y cuerpo de las peticiones); ver docs/architecture.md, sección 10.
 */
export async function fillSecret(field: Locator, secret: string): Promise<void> {
  await field.evaluate((element, value) => {
    if (!(element instanceof HTMLInputElement)) {
      throw new Error('fillSecret solo admite elementos <input>');
    }
    element.focus();
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, secret);
}
