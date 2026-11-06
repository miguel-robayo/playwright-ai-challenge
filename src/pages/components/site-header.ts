import type { Locator, Page } from '@playwright/test';

/** Cabecera común: estado de la sesión y accesos de cuenta. */
export class SiteHeader {
  /**
   * "Logged in as {nombre}": solo existe con sesión iniciada. Es un <a> sin href, sin
   * rol de enlace, por eso se localiza por su texto dentro de la cabecera.
   */
  readonly loggedInAs: Locator;
  readonly logoutLink: Locator;
  readonly signupLoginLink: Locator;
  private readonly deleteAccountLink: Locator;

  constructor(page: Page) {
    const header = page.locator('header');
    this.loggedInAs = header.getByText(/Logged in as/);
    this.logoutLink = header.getByRole('link', { name: 'Logout' });
    this.signupLoginLink = header.getByRole('link', { name: 'Signup / Login' });
    this.deleteAccountLink = header.getByRole('link', { name: 'Delete Account' });
  }

  /** Mecanismo oficial de la aplicación para eliminar la cuenta (`GET /delete_account`). */
  async deleteAccount(): Promise<void> {
    await this.deleteAccountLink.click();
  }
}
