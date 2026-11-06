import type { Locator, Page } from '@playwright/test';
import { type CartLineText, readCartLines } from './components/cart-line';

/** Checkout: `/checkout`. Direcciones del registro y resumen del pedido. */
export class CheckoutPage {
  /** Lista "Your delivery address", identificada por su encabezado. */
  readonly deliveryAddress: Locator;
  /** Lista "Your billing address", identificada por su encabezado. */
  readonly billingAddress: Locator;
  /** Filas de producto del resumen (`tr` con id `product-{id}`). */
  private readonly productRows: Locator;
  /** Importe de la fila "Total Amount", que no tiene id ni `data-qa`. */
  private readonly totalAmount: Locator;

  private readonly placeOrderLink: Locator;

  constructor(page: Page) {
    this.placeOrderLink = page.getByRole('link', { name: 'Place Order' });
    const addressList = (heading: string) =>
      page.getByRole('list').filter({ has: page.getByRole('heading', { name: heading }) });
    this.deliveryAddress = addressList('Your delivery address');
    this.billingAddress = addressList('Your billing address');

    const summaryRows = page.locator('#cart_info tbody tr');
    this.productRows = summaryRows.filter({ has: page.locator('.cart_description') });
    this.totalAmount = summaryRows.filter({ hasText: 'Total Amount' }).locator('.cart_total_price');
  }

  /** "Place Order" es un enlace a `/payment` (un GET: el guard de pago no lo afecta). */
  async placeOrder(): Promise<void> {
    await this.placeOrderLink.click();
  }

  /** Líneas de una dirección en el orden en que se muestran (la primera es el encabezado). */
  async readAddressLines(address: Locator): Promise<string[]> {
    await address.waitFor();
    return address.getByRole('listitem').allInnerTexts();
  }

  async readSummary(): Promise<{ lines: CartLineText[]; totalAmount: string }> {
    const [lines, totalAmount] = await Promise.all([
      readCartLines(this.productRows),
      this.totalAmount.innerText(),
    ]);
    return { lines, totalAmount };
  }
}
