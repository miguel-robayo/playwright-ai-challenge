import type { Locator, Page } from '@playwright/test';

/** Modal "Added!" (`#cartModal`) que aparece en el listado y en el detalle al añadir un producto. */
export class ProductAddedModal {
  readonly root: Locator;

  constructor(page: Page) {
    this.root = page.locator('#cartModal');
  }
}
