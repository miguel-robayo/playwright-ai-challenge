import type { Locator } from '@playwright/test';

/** Texto de una fila de productos tal como lo muestra la página, sin interpretar. */
export interface CartLineText {
  readonly name: string;
  readonly price: string;
  readonly quantity: string;
  readonly total: string;
}

/**
 * Lee las filas de producto de una tabla de carrito. El carrito (`/view_cart`) y el
 * resumen del checkout usan las mismas celdas; las clases son el único identificador
 * que tienen (no hay `data-qa` ni roles propios).
 */
export async function readCartLines(rows: Locator): Promise<CartLineText[]> {
  return Promise.all(
    (await rows.all()).map(async (row) => {
      const [name, price, quantity, total] = await Promise.all([
        row.locator('.cart_description h4').innerText(),
        row.locator('.cart_price').innerText(),
        row.locator('.cart_quantity').innerText(),
        row.locator('.cart_total_price').innerText(),
      ]);
      return { name, price, quantity, total };
    }),
  );
}
