import type { Locator, Page } from '@playwright/test';

/** Modal "Added!" (`#cartModal`) que aparece en el listado y en el detalle al añadir un producto. */
export class ProductAddedModal {
  readonly root: Locator;

  constructor(page: Page) {
    this.root = page.locator('#cartModal');
  }

  /** Espera la confirmación y la cierra con "Continue Shopping". */
  async continueShopping(): Promise<void> {
    await this.root.waitFor({ state: 'visible' });
    await this.root.getByRole('button', { name: 'Continue Shopping' }).click();
    await this.root.waitFor({ state: 'hidden' });
  }
}
