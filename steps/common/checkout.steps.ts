import { expect } from '@playwright/test';
import { Given, Then, When } from '../../src/fixtures/index';
import type { RegistrationProfile } from '../../src/data/registration-profile';
import { cartContents, sortLinesByName } from '../../src/questions/cart.questions';
import {
  type CheckoutAddress,
  checkoutAddresses,
  checkoutSummary,
  normalize,
} from '../../src/questions/checkout.questions';
import { addListedProductToCart } from '../../src/tasks/cart.tasks';

Given('un usuario anónimo con un producto en el carrito', async ({ app, scenario }) => {
  const { product } = await addListedProductToCart(app, 0);
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

/** Dirección que el checkout debe mostrar para un perfil registrado (formato observado en la Fase 1.3). */
function expectedAddress(profile: RegistrationProfile): CheckoutAddress {
  return {
    fullName: normalize(`${profile.title}. ${profile.firstName} ${profile.lastName}`),
    company: normalize(profile.company),
    address1: normalize(profile.address1),
    address2: normalize(profile.address2),
    cityStateZip: normalize(`${profile.city} ${profile.state} ${profile.zipcode}`),
    country: profile.country,
    phone: profile.mobileNumber,
  };
}

Then(
  'las direcciones de entrega y facturación coinciden con los datos del registro',
  async ({ app, page, scenario }) => {
    await expect(page).toHaveURL(/\/checkout$/);
    const expected = expectedAddress(scenario.recall('profile'));
    await expect
      .poll(() => checkoutAddresses(app))
      .toEqual({ delivery: expected, billing: expected });
  },
);

Then(
  'el importe total es la suma de los totales de las filas del carrito',
  async ({ app, scenario }) => {
    // Las filas del checkout son las del carrito que comprobó la precondición.
    await expect
      .poll(async () => sortLinesByName((await checkoutSummary(app)).lines))
      .toEqual(scenario.recall('cartSnapshot'));
    const { lines, totalAmount } = await checkoutSummary(app);
    expect(totalAmount).toBe(lines.reduce((sum, line) => sum + line.total, 0));
  },
);
