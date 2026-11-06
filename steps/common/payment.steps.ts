import { expect } from '@playwright/test';
import { Given, Then, When } from '../../src/fixtures/index';
import { PAYMENT_FIELDS } from '../../src/pages/payment.page';
import { interceptedPayments, paymentFormValidity } from '../../src/questions/payment.questions';
import { addListedProductToCart } from '../../src/tasks/cart.tasks';
import { goToPayment } from '../../src/tasks/payment.tasks';
import { registerIsolatedUser } from '../support/preconditions';

Given(
  'un usuario autenticado en la página de pago',
  async ({ app, scenario, syntheticData, accounts }) => {
    await registerIsolatedUser({ app, scenario, syntheticData, accounts });
    await addListedProductToCart(app, 0);
    await goToPayment(app);
    // Precondición: el formulario de pago está disponible.
    await expect(app.payment.payButton).toBeVisible();
  },
);

When('el usuario envía el formulario de pago sin datos', async ({ app }) => {
  await app.payment.submit();
});

When(
  'el usuario envía el formulario de pago con datos de tarjeta sintéticos',
  async ({ app, scenario, syntheticData }) => {
    const card = syntheticData.paymentCard(scenario.recall('profile').name);
    scenario.remember('paymentCard', card);
    await app.payment.fillCard(card);
    await app.payment.submit();
  },
);

Then('todos los campos de pago indican que falta un valor', async ({ app }) => {
  const validity = await paymentFormValidity(app);
  expect(validity.valueMissing).toEqual(
    Object.fromEntries(PAYMENT_FIELDS.map((field) => [field, true])),
  );
  // Un formulario no válido es la prueba determinista de que el navegador no lo envía.
  expect(validity.formIsValid).toBe(false);
});

Then('no se envía ninguna petición de pago', ({ networkGuards }) => {
  expect(networkGuards.paymentRequests).toHaveLength(0);
  expect(networkGuards.requestCount('POST', '/payment')).toBe(0);
});

Then('se intercepta exactamente una petición POST de pago', async ({ networkGuards, baseURL }) => {
  await expect.poll(() => interceptedPayments(networkGuards).length).toBe(1);
  const [payment] = interceptedPayments(networkGuards);
  expect(payment?.method).toBe('POST');
  expect(payment?.url).toBe(new URL('/payment', baseURL).href);
  expect(payment?.contentType).toContain('application/x-www-form-urlencoded');
});

Then('contiene los campos de pago introducidos y un token CSRF', ({ networkGuards, scenario }) => {
  const card = scenario.recall('paymentCard');
  const [payment] = interceptedPayments(networkGuards);
  // Los campos se comparan ya saneados: el valor del CSRF nunca llega a un error ni al reporte.
  expect(payment?.fields).toEqual({
    name_on_card: card.nameOnCard,
    card_number: card.number,
    cvc: card.cvc,
    expiry_month: card.expiryMonth,
    expiry_year: card.expiryYear,
  });
  expect(payment?.csrfTokenPresent).toBe(true);
});

Then('la petición se aborta antes de llegar al servidor', async ({ networkGuards }) => {
  await expect
    .poll(() => interceptedPayments(networkGuards)[0]?.failure)
    .toBe('net::ERR_BLOCKED_BY_CLIENT');
  expect(networkGuards.paymentResponses).toBe(0);
});
