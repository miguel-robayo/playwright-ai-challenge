import { en, Faker } from '@faker-js/faker';
import { z } from 'zod';
import { seedNumber, type SeedParts } from './seed';

/** Algoritmo de Luhn: true si el número tiene un dígito de control válido. */
export function passesLuhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

export const PaymentCardSchema = z.object({
  nameOnCard: z.string().trim().min(1).max(60),
  /**
   * 16 dígitos que fallan Luhn a propósito. Reduce la probabilidad de coincidir con una
   * tarjeta real, pero NO lo garantiza: la protección efectiva es que el POST /payment
   * se aborta antes de llegar al servidor.
   */
  number: z
    .string()
    .regex(/^\d{16}$/)
    .refine((number) => !passesLuhn(number), 'el número debe fallar Luhn'),
  cvc: z.string().regex(/^\d{3}$/),
  expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/),
  expiryYear: z.string().regex(/^20\d{2}$/),
});

export type PaymentCard = z.infer<typeof PaymentCardSchema>;

/**
 * Genera una tarjeta sintética determinista (misma semilla → misma tarjeta), validada
 * con Zod. Nunca usa el LLM ni datos reales; el año de vencimiento es fijo respecto a
 * 2026 para no depender del día de ejecución.
 */
export function generatePaymentCard(seed: SeedParts, nameOnCard: string): PaymentCard {
  const faker = new Faker({ locale: [en] });
  faker.seed(seedNumber(seed));

  const body = faker.string.numeric({ length: 15, allowLeadingZeros: false });
  const validCheckDigit = [...Array(10).keys()].find((d) => passesLuhn(`${body}${String(d)}`));
  // Cualquier dígito distinto del de control válido hace fallar Luhn.
  const checkDigit = ((validCheckDigit ?? 0) + 1) % 10;

  return PaymentCardSchema.parse({
    nameOnCard,
    number: `${body}${String(checkDigit)}`,
    cvc: faker.string.numeric({ length: 3, allowLeadingZeros: true }),
    expiryMonth: String(faker.number.int({ min: 1, max: 12 })).padStart(2, '0'),
    expiryYear: String(faker.number.int({ min: 2027, max: 2032 })),
  });
}
