import {
  generateRegistrationProfile,
  redactProfile,
  type RegistrationProfile,
} from '../data/registration-profile';
import { seedKey, type SeedParts } from '../data/seed';

/** Registro de un dato generado, apto para el reporte (sin contraseña). */
export interface GeneratedDataRecord {
  readonly seed: string;
  readonly profile: ReturnType<typeof redactProfile>;
}

/**
 * Generador de datos de un test. Cada llamada usa la semilla del test más un índice
 * propio, así un escenario puede generar varios perfiles distintos y reproducibles.
 */
export class SyntheticData {
  readonly #generated: GeneratedDataRecord[] = [];

  constructor(private readonly base: Omit<SeedParts, 'index'>) {}

  registrationProfile(): RegistrationProfile {
    const seed: SeedParts = { ...this.base, index: this.#generated.length };
    const profile = generateRegistrationProfile(seed);
    this.#generated.push({ seed: seedKey(seed), profile: redactProfile(profile) });
    return profile;
  }

  get generated(): readonly GeneratedDataRecord[] {
    return this.#generated;
  }
}
