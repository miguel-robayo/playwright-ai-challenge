import type { Locator, Page } from '@playwright/test';
import { fillSecret } from '../interactions/secret-input';

/** `/login`: formularios "New User Signup!" y "Login to your account". */
export class SignupLoginPage {
  /**
   * Mensaje de error del formulario de login. No tiene `data-qa` ni rol, y su texto
   * está siempre en el HTML; por eso se acota al formulario de login y el paso que lo
   * use debe comprobar su visibilidad y su texto.
   */
  readonly loginError: Locator;

  constructor(private readonly page: Page) {
    this.loginError = page.locator('form[action="/login"] p');
  }

  async open(): Promise<void> {
    await this.page.goto('/login');
  }

  /** Primer paso del registro: nombre y correo. */
  async startSignup(name: string, email: string): Promise<void> {
    await this.page.getByTestId('signup-name').fill(name);
    await this.page.getByTestId('signup-email').fill(email);
    await this.page.getByTestId('signup-button').click();
  }

  async submitLogin(email: string, password: string): Promise<void> {
    await this.page.getByTestId('login-email').fill(email);
    await fillSecret(this.page.getByTestId('login-password'), password);
    await this.page.getByTestId('login-button').click();
  }
}
