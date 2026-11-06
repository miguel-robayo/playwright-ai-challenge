import type { Page, Response } from '@playwright/test';

/** Respuesta HTTP que se espera como resultado de una acción. */
export interface ExpectedResponse {
  readonly method: 'GET' | 'POST';
  /** Ruta exacta en el origen de la aplicación, por ejemplo `/add_to_cart/1`. */
  readonly path: string;
  readonly status: number;
}

/**
 * Ejecuta una acción y espera la respuesta HTTP que debe producir.
 * Sincroniza por red en lugar de por tiempo: la acción se considera completada
 * cuando el servidor respondió. Si la respuesta tiene otro código, falla indicando
 * cuál llegó, porque la preparación del escenario no se cumplió.
 */
export async function performAndAwaitResponse(
  page: Page,
  expected: ExpectedResponse,
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
  if (response.status() !== expected.status) {
    throw new Error(
      `${expected.method} ${expected.path} respondió ${String(response.status())}; se esperaba ${String(expected.status)}`,
    );
  }
  return response;
}
