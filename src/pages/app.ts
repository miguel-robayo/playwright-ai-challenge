import type { Page } from '@playwright/test';
import { CartPage } from './cart.page';
import { ProductAddedModal } from './components/product-added-modal';
import { ProductsPage } from './products.page';

/**
 * Page Objects de un escenario, todos sobre la misma `page`.
 * Lo crea el fixture `app` en cada test: no se comparte entre escenarios.
 */
export class App {
  readonly products: ProductsPage;
  readonly productAddedModal: ProductAddedModal;
  readonly cart: CartPage;

  constructor(readonly page: Page) {
    this.products = new ProductsPage(page);
    this.productAddedModal = new ProductAddedModal(page);
    this.cart = new CartPage(page);
  }
}
