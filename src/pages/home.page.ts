import type { Page } from '@playwright/test';

/** Página de inicio: `/`. */
export class HomePage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/');
  }
}
