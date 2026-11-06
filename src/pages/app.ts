import type { Page } from '@playwright/test';
import { AccountConfirmationPage } from './account-confirmation.page';
import { AccountInformationPage } from './account-information.page';
import { CartPage } from './cart.page';
import { ProductAddedModal } from './components/product-added-modal';
import { SiteHeader } from './components/site-header';
import { ProductsPage } from './products.page';
import { SignupLoginPage } from './signup-login.page';

/**
 * Page Objects de una sesión de navegador, todos sobre la misma `page`.
 * El fixture `app` crea la del test; `browserSessions` crea una por cada contexto
 * adicional. Nunca se comparten entre escenarios.
 */
export class App {
  readonly header: SiteHeader;
  readonly signupLogin: SignupLoginPage;
  readonly accountInformation: AccountInformationPage;
  readonly accountConfirmation: AccountConfirmationPage;
  readonly products: ProductsPage;
  readonly productAddedModal: ProductAddedModal;
  readonly cart: CartPage;

  constructor(readonly page: Page) {
    this.header = new SiteHeader(page);
    this.signupLogin = new SignupLoginPage(page);
    this.accountInformation = new AccountInformationPage(page);
    this.accountConfirmation = new AccountConfirmationPage(page);
    this.products = new ProductsPage(page);
    this.productAddedModal = new ProductAddedModal(page);
    this.cart = new CartPage(page);
  }
}
