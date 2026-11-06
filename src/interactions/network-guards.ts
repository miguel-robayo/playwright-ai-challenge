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

/**
 * Operaciones que modifican estado en el servidor mediante GET (observadas en el
 * análisis). En un contexto de solo lectura se abortan antes de salir del navegador.
 */
export const STATE_CHANGING_PATHS = [/^\/add_to_cart\//, /^\/delete_cart\//, /^\/delete_account$/];

export interface InterceptedPaymentRequest {
  readonly method: string;
  readonly url: string;
  readonly postData: string | null;
}

/** Petición a la aplicación: solo método y ruta, nunca cuerpos ni cabeceras. */
export interface AppRequest {
  readonly method: string;
  readonly path: string;
}

export interface GuardOptions {
  /** Contexto de solo lectura (`@shared-session`): aborta las operaciones de STATE_CHANGING_PATHS. */
  readonly readOnly: boolean;
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
  readonly #blockedStateChanges: AppRequest[] = [];
  readonly #appRequests: AppRequest[] = [];
  readonly #blockedHosts = new Set<string>();
  #blockedRequests = 0;

  private constructor(private readonly appOrigin: string) {}

  static async install(
    context: BrowserContext,
    baseURL: string,
    options: GuardOptions = { readOnly: false },
  ): Promise<NetworkGuards> {
    const guards = new NetworkGuards(new URL(baseURL).origin);
    context.on('request', (request) => {
      const url = new URL(request.url());
      if (url.origin === guards.appOrigin && isNavigationOrApiCall(request)) {
        guards.#appRequests.push({ method: request.method(), path: url.pathname });
      }
    });
    if (options.readOnly) {
      await context.route(
        (url) =>
          url.origin === guards.appOrigin &&
          STATE_CHANGING_PATHS.some((pattern) => pattern.test(url.pathname)),
        async (route) => {
          const request = route.request();
          guards.#blockedStateChanges.push({
            method: request.method(),
            path: new URL(request.url()).pathname,
          });
          await route.abort('blockedbyclient');
        },
      );
    }
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

  /** Operaciones de estado abortadas por estar en un contexto de solo lectura. */
  get blockedStateChanges(): readonly AppRequest[] {
    return this.#blockedStateChanges;
  }

  /** Cuántas peticiones de documento o API con ese método y ruta envió la página. */
  requestCount(method: string, path: string): number {
    return this.#appRequests.filter((r) => r.method === method && r.path === path).length;
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

/** Navegaciones y llamadas XHR/fetch; se excluyen imágenes, estilos, scripts y fuentes. */
function isNavigationOrApiCall(request: Request): boolean {
  return ['document', 'xhr', 'fetch'].includes(request.resourceType());
}

function toRecord(request: Request): InterceptedPaymentRequest {
  return { method: request.method(), url: request.url(), postData: request.postData() };
}
