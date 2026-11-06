import type { App } from '../pages/app';
import { parsePrice } from './price';

export interface ListedProduct {
  readonly id: string;
  readonly name: string;
  /** Precio en rupias. */
  readonly price: number;
}

/**
 * ¿Qué producto aparece en esa posición del listado? Requiere estar en `/products`.
 * Evita fijar productos como literales: los valores esperados salen de la página.
 */
export async function listedProduct(app: App, position: number): Promise<ListedProduct> {
  const card = await app.products.readCard(position);
  return { id: card.id, name: card.name.trim(), price: parsePrice(card.price) };
}

/** ¿Qué nombre y precio muestra el detalle abierto? Requiere estar en `/product_details/{id}`. */
export async function productDetails(app: App): Promise<{ name: string; price: number }> {
  const detail = await app.productDetail.read();
  return { name: detail.name.trim(), price: parsePrice(detail.price) };
}
