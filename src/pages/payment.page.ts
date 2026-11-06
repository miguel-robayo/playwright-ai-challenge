import type { Locator, Page } from '@playwright/test';
import type { PaymentCard } from '../data/payment-card';

export const PAYMENT_FIELDS = [
  'name-on-card',
  'card-number',
  'cvc',
  'expiry-month',
  'expiry-year',
] as const;

export type PaymentField = (typeof PAYMENT_FIELDS)[number];

/** Pago: `/payment`. Todos los campos y el botón tienen `data-qa`. */
export class PaymentPage {
  readonly payButton: Locator;
  private readonly form: Locator;

  constructor(private readonly page: Page) {
    this.payButton = page.getByTestId('pay-button');
    this.form = page.locator('form').filter({ has: this.payButton });
  }

  /** Rellena la tarjeta sintética. No envía el formulario. */
  async fillCard(card: PaymentCard): Promise<void> {
    await this.field('name-on-card').fill(card.nameOnCard);
    await this.field('card-number').fill(card.number);
    await this.field('cvc').fill(card.cvc);
    await this.field('expiry-month').fill(card.expiryMonth);
    await this.field('expiry-year').fill(card.expiryYear);
  }

  /** "Pay and Confirm Order". El guard de red aborta siempre el POST resultante. */
  async submit(): Promise<void> {
    await this.payButton.click();
  }

  /**
   * Estado de la validación nativa: `validity.valueMissing` por campo y
   * `checkValidity()` del formulario. No usa `validationMessage`, que depende del idioma.
   */
  async readValidity(): Promise<{
    valueMissing: Record<PaymentField, boolean>;
    formIsValid: boolean;
  }> {
    const entries = await Promise.all(
      PAYMENT_FIELDS.map(
        async (name) =>
          [
            name,
            await this.field(name).evaluate((el) => (el as HTMLInputElement).validity.valueMissing),
          ] as const,
      ),
    );
    const formIsValid = await this.form.evaluate((el) => (el as HTMLFormElement).checkValidity());
    return {
      valueMissing: Object.fromEntries(entries) as Record<PaymentField, boolean>,
      formIsValid,
    };
  }

  private field(name: PaymentField): Locator {
    return this.page.getByTestId(name);
  }
}
