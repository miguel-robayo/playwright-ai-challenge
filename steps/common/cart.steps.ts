import { expect } from '@playwright/test';
import { Given, Then, When } from '../../src/fixtures/index';
import { type CartLine, cartContents } from '../../src/questions/cart.questions';
import { productDetails } from '../../src/questions/products.questions';
import { logIn } from '../../src/tasks/account.tasks';
import {
  type AddToCartResult,
  addListedProductToCart,
  addProductFromDetails,
  openProductDetails,
} from '../../src/tasks/cart.tasks';
import type { App } from '../../src/pages/app';
import { registerIsolatedUser } from '../support/preconditions';

/** Filas que debe mostrar el carrito según lo añadido: cantidades sumadas por producto. */
function expectedCartLines(added: readonly AddToCartResult[]): CartLine[] {
  const lines = new Map<string, CartLine>();
  for (const { product, quantity } of added) {
    const total = (lines.get(product.name)?.quantity ?? 0) + quantity;
    lines.set(product.name, {
      name: product.name,
      price: product.price,
      quantity: total,
      total: product.price * total,
    });
  }
  return sortByName([...lines.values()]);
}

function sortByName(lines: readonly CartLine[]): CartLine[] {
  return [...lines].sort((a, b) => a.name.localeCompare(b.name));
}

/** Contenido del carrito ordenado por nombre. Requiere estar en `/view_cart`. */
async function sortedCart(session: App): Promise<CartLine[]> {
  return sortByName(await cartContents(session));
}

// --- Detalle de producto ---

When('el usuario abre el detalle de un producto desde el listado', async ({ app, scenario }) => {
  scenario.remember('listedProduct', await openProductDetails(app, 0));
});

Then(
  'el nombre y el precio coinciden con la tarjeta del listado',
  async ({ app, page, scenario }) => {
    const listed = scenario.recall('listedProduct');
    await expect(page).toHaveURL(new RegExp(`/product_details/${listed.id}$`));
    await expect
      .poll(() => productDetails(app))
      .toEqual({ name: listed.name, price: listed.price });
  },
);

// --- Añadir al carrito ---

When('el usuario añade un producto desde el listado', async ({ app, scenario }) => {
  scenario.remember('addedProducts', [await addListedProductToCart(app, 0)]);
});

When(
  'el usuario añade otro producto con cantidad 3 desde su página de detalle',
  async ({ app, scenario }) => {
    const added = await addProductFromDetails(app, 1, 3);
    scenario.remember('addedProducts', [...scenario.recall('addedProducts'), added]);
  },
);

When('el usuario añade dos veces el mismo producto', async ({ app, scenario }) => {
  const first = await addListedProductToCart(app, 0);
  const second = await addListedProductToCart(app, 0);
  scenario.remember('addedProducts', [first, second]);
});

Then('la petición de añadir al carrito es correcta', ({ scenario }) => {
  const last = scenario.recall('addedProducts').at(-1);
  expect(last?.response.status).toBe(200);
  expect(last?.response.body).toBe('Added To Cart');
});

Then('la confirmación de producto añadido es visible', async ({ app }) => {
  await expect(app.productAddedModal.root).toBeVisible();
  await expect(app.productAddedModal.root).toContainText('Your product has been added to cart.');
});

Then(
  'el total de cada fila del carrito es el precio multiplicado por la cantidad',
  async ({ app, scenario }) => {
    await app.cart.open();
    const expected = expectedCartLines(scenario.recall('addedProducts'));
    await expect.poll(() => sortedCart(app)).toEqual(expected);
    for (const line of await cartContents(app)) {
      expect(line.total, `total de "${line.name}"`).toBe(line.price * line.quantity);
    }
  },
);

Then(
  'el carrito contiene una sola fila de ese producto con cantidad 2',
  async ({ app, scenario }) => {
    const [first] = scenario.recall('addedProducts');
    if (!first) throw new Error('El escenario no añadió ningún producto');
    await app.cart.open();
    await expect
      .poll(() => cartContents(app))
      .toEqual([
        {
          name: first.product.name,
          price: first.product.price,
          quantity: 2,
          total: first.product.price * 2,
        },
      ]);
  },
);

// --- Persistencia ---

Given(
  'un usuario autenticado con productos en el carrito',
  async ({ app, scenario, syntheticData, accounts }) => {
    await registerIsolatedUser({ app, scenario, syntheticData, accounts });
    const added = [await addListedProductToCart(app, 0), await addProductFromDetails(app, 1, 2)];
    scenario.remember('addedProducts', added);
    await app.cart.open();

    // Precondición: el carrito contiene exactamente lo añadido.
    const expected = expectedCartLines(added);
    await expect.poll(() => sortedCart(app)).toEqual(expected);
    scenario.remember('cartSnapshot', expected);
  },
);

When('el usuario navega a otra página y recarga el carrito', async ({ app }) => {
  await app.home.open();
  await app.products.open();
  await app.cart.open();
  await app.cart.reload();
});

When(
  'el usuario inicia sesión con la misma cuenta desde un contexto de navegador nuevo',
  async ({ scenario, browserSessions }) => {
    const session = await browserSessions.open();
    scenario.remember('activeSession', session);
    expect(await logIn(session, scenario.recall('profile'))).toBe('accepted');
  },
);

Then('las filas del carrito no cambian', async ({ app, scenario }) => {
  const session = scenario.recallOr('activeSession', app);
  await session.cart.open();
  await expect.poll(() => sortedCart(session)).toEqual(scenario.recall('cartSnapshot'));
});
