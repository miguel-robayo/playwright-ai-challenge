import type { Page } from '@playwright/test';

/**
 * Variantes controladas del DOM para las pruebas de resiliencia (obstáculo 1 del reto).
 * Son una SIMULACIÓN: solo cubren los cambios definidos aquí, no cualquier cambio real
 * de la aplicación. Cada variante marca `<html data-qa-variant="…">` para que el
 * escenario pueda comprobar que se aplicó.
 */
export type DomVariant = 'cosmetic' | 'contract-removed';

const TRANSFORMS: Record<DomVariant, (html: string) => string> = {
  /** Cambia todos los `id` y `class` y añade contenedores; mantiene data-qa, roles y textos. */
  cosmetic: (html) =>
    html
      .replace(/\b(id|class)="([^"]*)"/g, (_match, attribute: string, value: string) => {
        const renamed = value
          .split(/\s+/)
          .filter(Boolean)
          .map((token) => `qa-variant-${token}`)
          .join(' ');
        return `${attribute}="${renamed}"`;
      })
      .replace(/<body([^>]*)>/, '<body$1><div class="qa-variant-wrapper"><section>')
      .replace(/<\/body>/, '</section></div></body>'),

  /** Elimina el contrato de los localizadores: sin `data-qa` y con el botón "Login" renombrado. */
  'contract-removed': (html) =>
    html
      .replace(/\sdata-qa="[^"]*"/g, '')
      .replace(/(<button[^>]*>)\s*Login\s*(<\/button>)/g, '$1Sign in$2'),
};

/**
 * Sirve una variante del documento HTML de `path`: pide el HTML real con `route.fetch()`,
 * lo transforma y lo entrega con `route.fulfill`. Solo afecta a la navegación del
 * documento, no a sus recursos.
 */
export async function serveDomVariant(
  page: Page,
  path: string,
  variant: DomVariant,
): Promise<void> {
  await page.route(
    (url) => url.pathname === path,
    async (route) => {
      if (route.request().resourceType() !== 'document') {
        await route.fallback();
        return;
      }
      const response = await route.fetch();
      const html = TRANSFORMS[variant](await response.text()).replace(
        /<html([^>]*)>/,
        `<html$1 data-qa-variant="${variant}">`,
      );
      await route.fulfill({ response, body: html });
    },
  );
}
