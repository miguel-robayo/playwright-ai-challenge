import type { Locator, Page } from '@playwright/test';
import { type CartLineText, readCartLines } from './components/cart-line';

/** Carrito: `/view_cart`. */
export class CartPage {
  /** Aviso "Register / Login" que ve un usuario anónimo al continuar al checkout (`#checkoutModal`). */
  readonly checkoutPrompt: { readonly root: Locator; readonly registerOrLoginLink: Locator };

  private readonly lines: Locator;

  constructor(private readonly page: Page) {
    this.lines = page.locator('#cart_info_table tbody tr');
    const prompt = page.locator('#checkoutModal');
    this.checkoutPrompt = {
      root: prompt,
      registerOrLoginLink: prompt.getByRole('link', { name: 'Register / Login' }),
    };
  }

  async open(): Promise<void> {
    await this.page.goto('/view_cart');
  }

  async reload(): Promise<void> {
    await this.page.reload();
  }

  /** "Proceed To Checkout" es un <a> sin href: se localiza por su texto exacto. */
  async proceedToCheckout(): Promise<void> {
    await this.page.getByText('Proceed To Checkout', { exact: true }).click();
  }

  /** Fila del carrito de un producto, identificada por el enlace con su nombre. */
  line(productName: string): Locator {
    return this.lines.filter({
      has: this.page.getByRole('link', { name: productName, exact: true }),
    });
  }

  /** Lee las filas visibles en este momento. Devuelve [] si el carrito está vacío. */
  async readLines(): Promise<CartLineText[]> {
    return readCartLines(this.lines);
  }
}
