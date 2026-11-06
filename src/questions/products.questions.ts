import type { App } from '../pages/app';
import { parsePrice } from './price';

export interface ListedProduct {
  readonly id: string;
  readonly name: string;
  /** Precio en rupias. */
  readonly price: number;
}

/** ¿Qué producto aparece primero en el listado? Evita fijar productos como literales. */
export async function firstListedProduct(app: App): Promise<ListedProduct> {
  const card = await app.products.readCard(0);
  return { id: card.id, name: card.name.trim(), price: parsePrice(card.price) };
}
