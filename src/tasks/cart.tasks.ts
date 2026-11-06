import { performAndAwaitResponse } from '../interactions/network';
import type { App } from '../pages/app';
import { listedProduct, type ListedProduct } from '../questions/products.questions';

/** Resultado de añadir un producto: qué se añadió y qué respondió el servidor. */
export interface AddToCartResult {
  readonly product: ListedProduct;
  readonly quantity: number;
  readonly response: { readonly status: number; readonly body: string };
}

/**
 * Objetivo de negocio: añadir al carrito el producto de esa posición del listado.
 * Se sincroniza con `GET /add_to_cart/{id}` → 200 (respuesta observada: 200, cuerpo
 * "Added To Cart"). Deja abierto el modal de confirmación para que el escenario pueda
 * comprobarlo; la siguiente navegación lo descarta.
 */
export async function addListedProductToCart(app: App, position: number): Promise<AddToCartResult> {
  await app.products.open();
  const product = await listedProduct(app, position);
  const response = await performAndAwaitResponse(
    app.page,
    { method: 'GET', path: `/add_to_cart/${product.id}`, status: 200 },
    () => app.products.addToCart(product.id),
  );
  return {
    product,
    quantity: 1,
    response: { status: response.status(), body: await response.text() },
  };
}

/**
 * Objetivo de negocio: abrir el detalle del producto de esa posición del listado.
 * Devuelve el producto tal como lo mostraba el listado.
 */
export async function openProductDetails(app: App, position: number): Promise<ListedProduct> {
  await app.products.open();
  const product = await listedProduct(app, position);
  await app.products.openDetails(product.id);
  await app.page.waitForURL(`**/product_details/${product.id}`);
  return product;
}

/**
 * Objetivo de negocio: añadir varias unidades de un producto desde su detalle.
 * Respuesta observada: `GET /add_to_cart/{id}?quantity=N` → 200.
 */
export async function addProductFromDetails(
  app: App,
  position: number,
  quantity: number,
): Promise<AddToCartResult> {
  const product = await openProductDetails(app, position);
  await app.productDetail.setQuantity(quantity);
  const response = await performAndAwaitResponse(
    app.page,
    { method: 'GET', path: `/add_to_cart/${product.id}`, status: 200 },
    () => app.productDetail.addToCart(),
  );
  return {
    product,
    quantity,
    response: { status: response.status(), body: await response.text() },
  };
}
