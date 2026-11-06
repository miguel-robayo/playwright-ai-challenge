import type { Locator, Page } from '@playwright/test';
import type { RegistrationProfile } from '../data/registration-profile';
import { fillSecret } from '../interactions/secret-input';

/** Segundo paso del registro (`/signup`): información de la cuenta y dirección. */
export class AccountInformationPage {
  readonly heading: Locator;
  /** Nombre rellenado desde el primer paso. */
  readonly nameField: Locator;
  /** Correo rellenado desde el primer paso; la página lo muestra deshabilitado. */
  readonly emailField: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Enter Account Information' });
    this.nameField = page.getByTestId('name');
    this.emailField = page.getByTestId('email');
  }

  /** Rellena los campos del segundo paso con el perfil. No envía el formulario. */
  async fill(profile: RegistrationProfile): Promise<void> {
    await this.page.getByRole('radio', { name: `${profile.title}.`, exact: true }).check();
    await fillSecret(this.page.getByTestId('password'), profile.password);
    await this.page.getByTestId('days').selectOption(String(profile.birthDate.day));
    await this.page.getByTestId('months').selectOption({ label: profile.birthDate.month });
    await this.page.getByTestId('years').selectOption(String(profile.birthDate.year));
    await this.page.getByTestId('first_name').fill(profile.firstName);
    await this.page.getByTestId('last_name').fill(profile.lastName);
    await this.page.getByTestId('company').fill(profile.company);
    await this.page.getByTestId('address').fill(profile.address1);
    await this.page.getByTestId('address2').fill(profile.address2);
    await this.page.getByTestId('country').selectOption({ label: profile.country });
    await this.page.getByTestId('state').fill(profile.state);
    await this.page.getByTestId('city').fill(profile.city);
    await this.page.getByTestId('zipcode').fill(profile.zipcode);
    await this.page.getByTestId('mobile_number').fill(profile.mobileNumber);
  }

  async submit(): Promise<void> {
    await this.page.getByTestId('create-account').click();
  }
}
