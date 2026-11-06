import type { Locator, Page } from '@playwright/test';

/** Texto del detalle tal como lo muestra la página, sin interpretar. */
export interface ProductDetailText {
  readonly name: string;
  readonly price: string;
}

/** Detalle de producto: `/product_details/{id}`. Todo se acota a `.product-information`. */
export class ProductDetailPage {
  private readonly info: Locator;

  constructor(page: Page) {
    this.info = page.locator('.product-information');
  }

  async read(): Promise<ProductDetailText> {
    const [name, price] = await Promise.all([
      this.info.getByRole('heading').innerText(),
      // El precio es un <span> sin atributos dentro del bloque de compra ("Rs. 500").
      this.info.locator('span > span').innerText(),
    ]);
    return { name, price };
  }

  async setQuantity(quantity: number): Promise<void> {
    await this.info.getByRole('spinbutton').fill(String(quantity));
  }

  async addToCart(): Promise<void> {
    await this.info.getByRole('button', { name: 'Add to cart' }).click();
  }
}
