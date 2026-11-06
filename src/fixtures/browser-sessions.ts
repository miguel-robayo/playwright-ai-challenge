import type { Browser, BrowserContext } from '@playwright/test';
import { ACTION_TIMEOUT_MS, NAVIGATION_TIMEOUT_MS } from '../config/timeouts';
import { NetworkGuards } from '../interactions/network-guards';
import { App } from '../pages/app';

/**
 * Contextos de navegador adicionales de un test (por ejemplo, un login desde otra
 * sesión o la limpieza de cuentas). Cada uno tiene sus propios guards, cookies y
 * Page Objects, y se cierra al terminar el test.
 */
export class BrowserSessions {
  readonly #contexts: BrowserContext[] = [];

  constructor(
    private readonly browser: Browser,
    private readonly baseURL: string,
  ) {}

  /** Abre un contexto nuevo con los guards de red instalados antes de navegar. */
  async open(): Promise<App> {
    const context = await this.browser.newContext({ baseURL: this.baseURL });
    this.#contexts.push(context);
    // Los contextos creados a mano no heredan actionTimeout/navigationTimeout de `use`.
    context.setDefaultTimeout(ACTION_TIMEOUT_MS);
    context.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
    await NetworkGuards.install(context, this.baseURL);
    return new App(await context.newPage());
  }

  async closeAll(): Promise<void> {
    await Promise.all(this.#contexts.map((context) => context.close()));
  }
}
