import type { Page } from '@playwright/test';

/**
 * Responde en local con un 500 a las peticiones cuya ruta cumpla el patrón. La petición
 * no sale del navegador: se resuelve con `route.fulfill`, así que no modifica nada en
 * el servidor. Las rutas de la página tienen prioridad sobre los guards del contexto.
 */
export async function respondWithServerError(page: Page, pathPattern: RegExp): Promise<void> {
  await page.route(
    (url) => pathPattern.test(url.pathname),
    async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'text/html',
        body: 'Internal Server Error (simulado por la prueba)',
      });
    },
  );
}
