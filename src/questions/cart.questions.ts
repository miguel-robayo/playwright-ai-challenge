import type { App } from '../pages/app';
import { parsePrice } from './price';

export interface CartLine {
  readonly name: string;
  /** Precio unitario en rupias. */
  readonly price: number;
  readonly quantity: number;
  /** Total de la fila en rupias. */
  readonly total: number;
}

/**
 * ¿Qué contiene el carrito en este momento? Devuelve un valor, no un Locator:
 * úsese con `expect.poll` para conservar el reintento automático de Playwright.
 */
export async function cartContents(app: App): Promise<CartLine[]> {
  const lines = await app.cart.readLines();
  return lines.map((line) => ({
    name: line.name.trim(),
    price: parsePrice(line.price),
    quantity: Number(line.quantity.trim()),
    total: parsePrice(line.total),
  }));
}
