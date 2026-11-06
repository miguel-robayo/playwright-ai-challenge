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
  readonly loginEmailField: Locator;
  readonly loginPasswordField: Locator;
  readonly loginButton: Locator;

  constructor(private readonly page: Page) {
    this.loginError = page.locator('form[action="/login"] p');
    this.loginEmailField = page.getByTestId('login-email');
    this.loginPasswordField = page.getByTestId('login-password');
    this.loginButton = page.getByRole('button', { name: 'Login', exact: true });
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

  /** Rellena el formulario de login sin enviarlo. `timeout` limita la espera de cada campo. */
  async fillLogin(
    email: string,
    password: string,
    options: { timeout?: number } = {},
  ): Promise<void> {
    await this.loginEmailField.fill(email, options);
    await fillSecret(this.loginPasswordField, password, options);
  }

  async submitLogin(email: string, password: string): Promise<void> {
    await this.fillLogin(email, password);
    await this.page.getByTestId('login-button').click();
  }
}
