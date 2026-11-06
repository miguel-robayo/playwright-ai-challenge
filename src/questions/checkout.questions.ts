import type { App } from '../pages/app';
import { type CartLine, toCartLine } from './cart.questions';
import { parsePrice } from './price';

/** Dirección tal como la muestra el checkout, línea a línea. */
export interface CheckoutAddress {
  /** Tratamiento, nombre y apellido: "Mr. Nombre Apellido". */
  readonly fullName: string;
  readonly company: string;
  readonly address1: string;
  readonly address2: string;
  /** "ciudad estado código postal" en una sola línea. */
  readonly cityStateZip: string;
  readonly country: string;
  readonly phone: string;
}

/** Encabezado + 7 líneas, según lo observado en la aplicación. */
const ADDRESS_LINES = 8;

/** ¿Qué direcciones de entrega y facturación muestra el checkout? Requiere estar en `/checkout`. */
export async function checkoutAddresses(
  app: App,
): Promise<{ delivery: CheckoutAddress; billing: CheckoutAddress }> {
  const [delivery, billing] = await Promise.all([
    app.checkout.readAddressLines(app.checkout.deliveryAddress),
    app.checkout.readAddressLines(app.checkout.billingAddress),
  ]);
  return { delivery: toAddress(delivery), billing: toAddress(billing) };
}

/** ¿Qué productos e importe total resume el checkout? Requiere estar en `/checkout`. */
export async function checkoutSummary(
  app: App,
): Promise<{ lines: CartLine[]; totalAmount: number }> {
  const summary = await app.checkout.readSummary();
  return { lines: summary.lines.map(toCartLine), totalAmount: parsePrice(summary.totalAmount) };
}

function toAddress(lines: readonly string[]): CheckoutAddress {
  if (lines.length !== ADDRESS_LINES) {
    throw new Error(
      `La dirección tiene ${String(lines.length)} líneas; se esperaban ${String(ADDRESS_LINES)}`,
    );
  }
  const [, fullName, company, address1, address2, cityStateZip, country, phone] =
    lines.map(normalize);
  return {
    fullName: fullName ?? '',
    company: company ?? '',
    address1: address1 ?? '',
    address2: address2 ?? '',
    cityStateZip: cityStateZip ?? '',
    country: country ?? '',
    phone: phone ?? '',
  };
}

/** Une espacios y saltos de línea en un solo espacio, como al leer la página. */
export function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
