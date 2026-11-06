import type { Locator, Page } from '@playwright/test';

/** Páginas de confirmación de cuenta: `/account_created` y `/delete_account`. */
export class AccountConfirmationPage {
  readonly accountCreated: Locator;
  readonly accountDeleted: Locator;

  constructor(private readonly page: Page) {
    this.accountCreated = page.getByTestId('account-created');
    this.accountDeleted = page.getByTestId('account-deleted');
  }

  /** "Continue": en `/account_created` lleva al inicio con la sesión ya visible. */
  async continue(): Promise<void> {
    await this.page.getByTestId('continue-button').click();
  }
}
