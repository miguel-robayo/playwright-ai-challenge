import type { Browser, BrowserContext } from '@playwright/test';
import { ACTION_TIMEOUT_MS, NAVIGATION_TIMEOUT_MS } from '../config/timeouts';
import { type AppRequest, type GuardOptions, NetworkGuards } from '../interactions/network-guards';
import { App } from '../pages/app';

/**
 * Contextos de navegador adicionales de un test (por ejemplo, un login desde otra
 * sesión o la limpieza de cuentas). Cada uno tiene sus propios guards, cookies y
 * Page Objects, y se cierra al terminar el test. Los guards usan las mismas opciones
 * que el contexto del test (incluido el modo de solo lectura).
 */
export class BrowserSessions {
  readonly #contexts: BrowserContext[] = [];
  readonly #guards: NetworkGuards[] = [];

  constructor(
    private readonly browser: Browser,
    private readonly baseURL: string,
    private readonly guardOptions: GuardOptions,
  ) {}

  /** Abre un contexto nuevo con los guards de red instalados antes de navegar. */
  async open(): Promise<App> {
    const context = await this.browser.newContext({ baseURL: this.baseURL });
    this.#contexts.push(context);
    // Los contextos creados a mano no heredan actionTimeout/navigationTimeout de `use`.
    context.setDefaultTimeout(ACTION_TIMEOUT_MS);
    context.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
    this.#guards.push(await NetworkGuards.install(context, this.baseURL, this.guardOptions));
    return new App(await context.newPage());
  }

  /** Operaciones de estado bloqueadas en cualquiera de los contextos adicionales. */
  blockedStateChanges(): AppRequest[] {
    return this.#guards.flatMap((guards) => guards.blockedStateChanges);
  }

  async closeAll(): Promise<void> {
    await Promise.all(this.#contexts.map((context) => context.close()));
  }
}
