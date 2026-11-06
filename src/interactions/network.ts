import type { Page, Response } from '@playwright/test';

/** Petición HTTP que debe producir una acción. */
export interface ExpectedRequest {
  readonly method: 'GET' | 'POST';
  /** Ruta exacta en el origen de la aplicación, por ejemplo `/add_to_cart/1`. */
  readonly path: string;
}

/** Respuesta HTTP que se espera como resultado de una acción. */
export interface ExpectedResponse extends ExpectedRequest {
  readonly status: number;
}

/**
 * Ejecuta una acción y devuelve la respuesta HTTP que produce, sea cual sea su código.
 * Sincroniza por red en lugar de por tiempo. Úsese cuando el código forma parte del
 * resultado (por ejemplo, un login aceptado o rechazado).
 */
export async function performAndCaptureResponse(
  page: Page,
  expected: ExpectedRequest,
  action: () => Promise<void>,
): Promise<Response> {
  const [response] = await Promise.all([
    page.waitForResponse(
      (candidate) =>
        candidate.request().method() === expected.method &&
        new URL(candidate.url()).pathname === expected.path,
    ),
    action(),
  ]);
  return response;
}

/**
 * Ejecuta una acción y exige la respuesta HTTP que debe producir. Si llega otro código,
 * falla indicando cuál, porque la preparación del escenario no se cumplió.
 */
export async function performAndAwaitResponse(
  page: Page,
  expected: ExpectedResponse,
  action: () => Promise<void>,
): Promise<Response> {
  const response = await performAndCaptureResponse(page, expected, action);
  if (response.status() !== expected.status) {
    throw new Error(
      `${expected.method} ${expected.path} respondió ${String(response.status())}; se esperaba ${String(expected.status)}`,
    );
  }
  return response;
}
