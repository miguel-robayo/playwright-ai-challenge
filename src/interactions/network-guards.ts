import type { BrowserContext, Request } from '@playwright/test';

/**
 * Hosts de anuncios, consentimiento publicitario y telemetría observados en la
 * exploración de Automation Exercise (docs/known-defects.md, docs/test-strategy.md).
 * Las redes publicitarias secundarias (criteo, adsrvr, bidswitch…) solo las cargan
 * los scripts de estos hosts, así que no necesitan regla propia.
 * Se compara por sufijo de host: nunca se bloquean recursos de la aplicación.
 */
export const BLOCKED_HOST_SUFFIXES = [
  'googlesyndication.com', // AdSense: anuncios, vignette y anchor ad
  'doubleclick.net', // servidor de anuncios de Google
  'googleadservices.com',
  'adtrafficquality.google', // verificación de tráfico publicitario
  'fundingchoicesmessages.google.com', // mensajes de consentimiento publicitario
  'cloudflareinsights.com', // beacon de analítica de Cloudflare
] as const;

/** Telemetría de primera parte: Cloudflare RUM, enviada por POST desde cada página. */
export const BLOCKED_FIRST_PARTY_PATHS = ['/cdn-cgi/rum'] as const;

/** Ruta del formulario de pago. Ningún POST a esta ruta debe llegar al servidor. */
export const PAYMENT_PATH = '/payment';

export interface InterceptedPaymentRequest {
  readonly method: string;
  readonly url: string;
  readonly postData: string | null;
}

/**
 * Guards de red de un contexto de navegador.
 * - Aborta las peticiones a anuncios y telemetría identificados.
 * - Aborta SIEMPRE los POST a /payment (regla de seguridad del proyecto) y los registra
 *   para que un escenario pueda inspeccionarlos. No existe forma de desactivarlo.
 *   Si en el futuro se necesita un pago simulado, la respuesta se resolverá en local
 *   desde este mismo guard (route.fulfill), de modo que la petición siga sin salir
 *   del navegador.
 */
export class NetworkGuards {
  readonly #paymentRequests: InterceptedPaymentRequest[] = [];
  readonly #blockedHosts = new Set<string>();
  #blockedRequests = 0;

  private constructor(private readonly appOrigin: string) {}

  static async install(context: BrowserContext, baseURL: string): Promise<NetworkGuards> {
    const guards = new NetworkGuards(new URL(baseURL).origin);
    await context.route(
      (url) => guards.isAdOrTelemetry(url),
      async (route) => {
        guards.#blockedRequests++;
        guards.#blockedHosts.add(new URL(route.request().url()).host);
        await route.abort('blockedbyclient');
      },
    );
    await context.route(
      (url) => url.origin === guards.appOrigin && url.pathname === PAYMENT_PATH,
      async (route) => {
        const request = route.request();
        if (request.method() !== 'POST') {
          await route.fallback();
          return;
        }
        guards.#paymentRequests.push(toRecord(request));
        await route.abort('blockedbyclient');
      },
    );
    return guards;
  }

  /** Peticiones de anuncios y telemetría abortadas en este contexto. */
  get blockedRequests(): number {
    return this.#blockedRequests;
  }

  /** Hosts a los que se abortó alguna petición, para revisar el alcance del bloqueo. */
  get blockedHosts(): readonly string[] {
    return [...this.#blockedHosts].sort();
  }

  /** POST a /payment interceptados y abortados, en orden de llegada. */
  get paymentRequests(): readonly InterceptedPaymentRequest[] {
    return this.#paymentRequests;
  }

  private isAdOrTelemetry(url: URL): boolean {
    if (url.origin === this.appOrigin) {
      return BLOCKED_FIRST_PARTY_PATHS.some((path) => url.pathname.startsWith(path));
    }
    return BLOCKED_HOST_SUFFIXES.some(
      (suffix) => url.hostname === suffix || url.hostname.endsWith(`.${suffix}`),
    );
  }
}

function toRecord(request: Request): InterceptedPaymentRequest {
  return { method: request.method(), url: request.url(), postData: request.postData() };
}
