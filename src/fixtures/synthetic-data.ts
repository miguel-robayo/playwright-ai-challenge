import { generatePaymentCard, type PaymentCard } from '../data/payment-card';
import {
  generateRegistrationProfile,
  redactProfile,
  type RegistrationProfile,
} from '../data/registration-profile';
import { seedKey, type SeedParts } from '../data/seed';

/** Registro de un dato generado, apto para el reporte (sin contraseñas). */
export interface GeneratedDataRecord {
  readonly seed: string;
  readonly kind: 'registration-profile' | 'payment-card';
  readonly value: ReturnType<typeof redactProfile> | PaymentCard;
}

/**
 * Generador de datos de un test. Cada llamada usa la semilla del test más un índice
 * propio, así un escenario puede generar varios datos distintos y reproducibles.
 */
export class SyntheticData {
  readonly #generated: GeneratedDataRecord[] = [];

  constructor(private readonly base: Omit<SeedParts, 'index'>) {}

  registrationProfile(): RegistrationProfile {
    const seed = this.#nextSeed();
    const profile = generateRegistrationProfile(seed);
    this.#generated.push({
      seed: seedKey(seed),
      kind: 'registration-profile',
      value: redactProfile(profile),
    });
    return profile;
  }

  /** Tarjeta sintética (falla Luhn). Sus datos son ficticios y pueden adjuntarse al reporte. */
  paymentCard(nameOnCard: string): PaymentCard {
    const seed = this.#nextSeed();
    const card = generatePaymentCard(seed, nameOnCard);
    this.#generated.push({ seed: seedKey(seed), kind: 'payment-card', value: card });
    return card;
  }

  get generated(): readonly GeneratedDataRecord[] {
    return this.#generated;
  }

  #nextSeed(): SeedParts {
    return { ...this.base, index: this.#generated.length };
  }
}
