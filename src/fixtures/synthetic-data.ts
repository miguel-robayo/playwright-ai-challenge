import { generatePaymentCard, type PaymentCard } from '../data/payment-card';
import {
  generateRegistrationProfile,
  redactProfile,
  type RegistrationProfile,
} from '../data/registration-profile';
import { seedDigest, seedKey, type SeedParts } from '../data/seed';

/** Registro de un dato generado, apto para el reporte (sin contraseñas). */
export interface GeneratedDataRecord {
  readonly seed: string;
  readonly kind:
    'registration-profile' | 'payment-card' | 'reserved-email' | 'ai-registration-profile';
  readonly value: ReturnType<typeof redactProfile> | PaymentCard | string;
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

  /** Correo único y determinista (semilla del test) en example.com, para datos que propone la IA. */
  reserveEmail(prefix: string): string {
    const seed = this.#nextSeed();
    const email = `${prefix}.${seedDigest(seed)}@example.com`;
    this.#generated.push({ seed: seedKey(seed), kind: 'reserved-email', value: email });
    return email;
  }

  /** Registra un perfil propuesto por la IA y ya validado, con la contraseña censurada. */
  recordAiProfile(profile: RegistrationProfile): void {
    this.#generated.push({
      seed: 'ia',
      kind: 'ai-registration-profile',
      value: redactProfile(profile),
    });
  }

  get generated(): readonly GeneratedDataRecord[] {
    return this.#generated;
  }

  #nextSeed(): SeedParts {
    return { ...this.base, index: this.#generated.length };
  }
}
