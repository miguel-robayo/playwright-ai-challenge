import type { App } from '../pages/app';

/** ¿Qué variante del DOM muestra la página? `undefined` si es la original. Solo lectura. */
export async function appliedDomVariant(app: App): Promise<string | undefined> {
  return app.page.evaluate(() => document.documentElement.dataset.qaVariant);
}
