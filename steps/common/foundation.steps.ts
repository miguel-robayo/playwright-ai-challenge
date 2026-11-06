import { expect } from '@playwright/test';
import { Then, When } from '../../src/fixtures/index';

When('el usuario abre la página de inicio', async ({ page }) => {
  await page.goto('/');
});

Then('se muestra la página de inicio de Automation Exercise', async ({ page, baseURL }) => {
  await expect(page).toHaveURL(new URL('/', baseURL).href);
  await expect(page).toHaveTitle('Automation Exercise');
  await expect(page.getByRole('link', { name: 'Signup / Login' })).toBeVisible();
});
