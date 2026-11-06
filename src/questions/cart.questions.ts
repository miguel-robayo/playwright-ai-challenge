import type { App } from '../pages/app';
import type { CartLineText } from '../pages/components/cart-line';
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
 * ¿Qué contiene el carrito en este momento? Requiere estar en `/view_cart`.
 * Devuelve un valor, no un Locator: úsese con `expect.poll` para conservar el
 * reintento automático de Playwright.
 */
export async function cartContents(app: App): Promise<CartLine[]> {
  return (await app.cart.readLines()).map(toCartLine);
}

/** Interpreta el texto de una fila de producto (carrito o resumen del checkout). */
export function toCartLine(line: CartLineText): CartLine {
  return {
    name: line.name.trim(),
    price: parsePrice(line.price),
    quantity: Number(line.quantity.trim()),
    total: parsePrice(line.total),
  };
}

/** ¿Qué dice el aviso de checkout para usuarios anónimos? Requiere que esté visible. */
export async function checkoutPromptText(app: App): Promise<string> {
  return (await app.cart.checkoutPrompt.root.innerText()).trim();
}

/** Ordena filas por nombre para comparar contenidos sin depender del orden de la tabla. */
export function sortLinesByName(lines: readonly CartLine[]): CartLine[] {
  return [...lines].sort((a, b) => a.name.localeCompare(b.name));
}
