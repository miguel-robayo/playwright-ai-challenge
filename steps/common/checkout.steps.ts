import { expect } from '@playwright/test';
import { Given, Then, When } from '../../src/fixtures/index';
import { cartContents } from '../../src/questions/cart.questions';
import { addFirstListedProductToCart } from '../../src/tasks/cart.tasks';

Given('un usuario anónimo con un producto en el carrito', async ({ app, scenario }) => {
  const product = await addFirstListedProductToCart(app);
  scenario.remember('productInCart', product);
  await app.cart.open();

  // Precondición: el carrito contiene exactamente ese producto, una vez. Como cada escenario
  // tiene su propio contexto de navegador, cualquier resto de otro escenario haría fallar aquí.
  await expect
    .poll(() => cartContents(app), {
      message: `La preparación debía dejar solo "${product.name}" en el carrito`,
    })
    .toEqual([{ name: product.name, price: product.price, quantity: 1, total: product.price }]);
});

When('el usuario continúa al checkout', async ({ app }) => {
  await app.cart.proceedToCheckout();
});

Then(
  'se muestra un aviso para registrarse o iniciar sesión y el usuario permanece en el carrito',
  async ({ app, page, scenario }) => {
    const prompt = app.cart.checkoutPrompt;
    await expect(prompt.root).toBeVisible();
    await expect(prompt.root).toContainText('Register / Login account to proceed on checkout.');
    await expect(prompt.registerOrLoginLink).toHaveAttribute('href', '/login');

    await expect(page).toHaveURL(/\/view_cart$/);
    await expect(app.cart.line(scenario.recall('productInCart').name)).toBeVisible();
  },
);
