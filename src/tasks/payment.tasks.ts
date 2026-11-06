import type { App } from '../pages/app';

/**
 * Objetivo de negocio: llegar al formulario de pago por el flujo real
 * (carrito → "Proceed To Checkout" → "Place Order"). Requiere sesión iniciada y
 * productos en el carrito.
 */
export async function goToPayment(app: App): Promise<void> {
  await app.cart.open();
  await app.cart.proceedToCheckout();
  await app.page.waitForURL('**/checkout');
  await app.checkout.placeOrder();
  await app.page.waitForURL('**/payment');
}
