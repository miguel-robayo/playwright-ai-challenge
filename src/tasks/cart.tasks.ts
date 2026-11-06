import { performAndAwaitResponse } from '../interactions/network';
import type { App } from '../pages/app';
import { firstListedProduct, type ListedProduct } from '../questions/products.questions';

/**
 * Objetivo de negocio: tener en el carrito el primer producto del listado.
 * Coordina el listado, la petición al servidor y el modal de confirmación, y
 * devuelve qué producto se añadió para que el escenario lo recuerde.
 * La adición se considera hecha cuando `GET /add_to_cart/{id}` responde 200
 * (respuesta observada en el análisis: 200, cuerpo "Added To Cart").
 */
export async function addFirstListedProductToCart(app: App): Promise<ListedProduct> {
  await app.products.open();
  const product = await firstListedProduct(app);
  await performAndAwaitResponse(
    app.page,
    { method: 'GET', path: `/add_to_cart/${product.id}`, status: 200 },
    () => app.products.addToCart(product.id),
  );
  await app.productAddedModal.continueShopping();
  return product;
}
