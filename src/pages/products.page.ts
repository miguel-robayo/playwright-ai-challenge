import type { Locator, Page } from '@playwright/test';

/** Datos de una tarjeta del listado tal como los muestra la página, sin interpretar. */
export interface ProductCardText {
  readonly id: string;
  readonly name: string;
  readonly price: string;
}

/** Listado de productos: `/products`. */
export class ProductsPage {
  /**
   * Bloque visible de cada tarjeta. Excluye `.product-overlay`, que repite nombre,
   * precio y "Add to cart" al pasar el ratón: así cada texto existe una sola vez
   * dentro de la tarjeta.
   */
  private readonly cards: Locator;

  constructor(private readonly page: Page) {
    this.cards = page.locator('.productinfo');
  }

  async open(): Promise<void> {
    await this.page.goto('/products');
  }

  /** Lee la tarjeta en la posición indicada del listado (0 = primera). */
  async readCard(position: number): Promise<ProductCardText> {
    const card = this.cards.nth(position);
    const [id, name, price] = await Promise.all([
      card.locator('a.add-to-cart').getAttribute('data-product-id'),
      card.locator('p').innerText(),
      card.locator('h2').innerText(),
    ]);
    if (!id) throw new Error(`La tarjeta ${String(position)} no tiene data-product-id`);
    return { id, name, price };
  }

  /**
   * "View Product" de un producto concreto. El enlace se repite en todas las tarjetas y
   * está fuera de `.productinfo`; su `href` es la única asociación estable con el producto.
   */
  async openDetails(productId: string): Promise<void> {
    await this.page.locator(`a[href="/product_details/${productId}"]`).click();
  }

  /** "Add to cart" de un producto concreto. Es un <a> sin href, por eso se localiza por texto dentro de su tarjeta. */
  async addToCart(productId: string): Promise<void> {
    await this.card(productId).getByText('Add to cart', { exact: true }).click();
  }

  private card(productId: string): Locator {
    return this.cards.filter({
      has: this.page.locator(`a.add-to-cart[data-product-id="${productId}"]`),
    });
  }
}
