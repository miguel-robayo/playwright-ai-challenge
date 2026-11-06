import { expect } from '@playwright/test';
import { Given, Then, When } from '../../src/fixtures/index';
import { performAndAwaitResponse } from '../../src/interactions/network';
import { respondWithServerError } from '../../src/interactions/network-faults';
import { listedProduct } from '../../src/questions/products.questions';

Given('un usuario anónimo en la página de productos', async ({ app, scenario }) => {
  await app.products.open();
  scenario.remember('listedProduct', await listedProduct(app, 0));
});

Given('el endpoint de añadir al carrito responde con un error del servidor', async ({ app }) => {
  await respondWithServerError(app.page, /^\/add_to_cart\//);
});

When('el usuario añade un producto al carrito', async ({ app, scenario }) => {
  const { id } = scenario.recall('listedProduct');
  // Sincronización: la acción termina cuando llega la respuesta 500 simulada.
  await performAndAwaitResponse(
    app.page,
    { method: 'GET', path: `/add_to_cart/${id}`, status: 500 },
    () => app.products.addToCart(id),
  );
});

Then('la confirmación de producto añadido no se muestra', async ({ app }) => {
  // Se comprueba después de la respuesta: el modal solo se muestra en el callback de éxito.
  // El mismo localizador se comprueba visible en "Añadir productos y verificar los totales".
  await expect(app.productAddedModal.root).toBeHidden();
});
