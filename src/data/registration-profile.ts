import { randomInt } from 'node:crypto';
import { en, Faker } from '@faker-js/faker';
import { z } from 'zod';
import { seedDigest, seedNumber, type SeedParts } from './seed';

/** Países que admite el formulario de registro (observado en el análisis). */
export const SIGNUP_COUNTRIES = [
  'India',
  'United States',
  'Canada',
  'Australia',
  'Israel',
  'New Zealand',
  'Singapore',
] as const;

/** Dominio reservado (RFC 2606): nunca recibe correo real. */
export const SYNTHETIC_EMAIL_DOMAIN = 'example.com';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const text = (max: number) => z.string().trim().min(1).max(max);

export const RegistrationProfileSchema = z.object({
  title: z.enum(['Mr', 'Mrs']),
  /** Nombre visible de la cuenta: aparece como "Logged in as {name}". */
  name: text(60),
  email: z
    .email()
    .refine((email) => email.endsWith(`@${SYNTHETIC_EMAIL_DOMAIN}`), 'debe usar example.com'),
  /** El formulario solo exige un valor; se pide además longitud y variedad mínimas. */
  password: z.string().min(12).regex(/[a-z]/).regex(/[A-Z]/).regex(/\d/),
  birthDate: z.object({
    day: z.int().min(1).max(28),
    month: z.enum(MONTHS),
    year: z.int().min(1900).max(2021),
  }),
  firstName: text(40),
  lastName: text(40),
  company: text(80),
  address1: text(80),
  address2: text(40),
  country: z.enum(SIGNUP_COUNTRIES),
  state: text(40),
  city: text(40),
  zipcode: z.string().regex(/^[A-Za-z0-9 -]{3,10}$/),
  mobileNumber: z.string().regex(/^\d{10}$/),
});

export type RegistrationProfile = z.infer<typeof RegistrationProfileSchema>;

/** Fecha de referencia fija para que la fecha de nacimiento no dependa del día de ejecución. */
const REFERENCE_DATE = '2026-01-01T00:00:00.000Z';

/**
 * Genera un perfil de registro sintético y lo valida con Zod antes de devolverlo.
 *
 * Determinismo: todos los campos salvo la contraseña dependen solo de la semilla.
 * La contraseña se genera con aleatoriedad criptográfica a propósito: así la semilla y
 * TEST_RUN_ID pueden adjuntarse al reporte sin permitir reconstruir credenciales.
 */
export function generateRegistrationProfile(seed: SeedParts): RegistrationProfile {
  // Instancia propia por llamada: no se usa ni se modifica el `faker` global.
  const faker = new Faker({ locale: [en] });
  faker.seed(seedNumber(seed));

  const sex = faker.person.sexType();
  const firstName = faker.person.firstName(sex);
  const lastName = faker.person.lastName();
  const birth = faker.date.birthdate({ mode: 'age', min: 18, max: 80, refDate: REFERENCE_DATE });

  return RegistrationProfileSchema.parse({
    title: sex === 'female' ? 'Mrs' : 'Mr',
    name: `${firstName} ${lastName}`,
    email: `qa.${seedDigest(seed)}@${SYNTHETIC_EMAIL_DOMAIN}`,
    password: generatePassword(),
    birthDate: {
      day: Math.min(birth.getUTCDate(), 28),
      month: MONTHS[birth.getUTCMonth()],
      year: birth.getUTCFullYear(),
    },
    firstName,
    lastName,
    company: faker.company.name(),
    address1: faker.location.streetAddress(),
    address2: faker.location.secondaryAddress(),
    country: faker.helpers.arrayElement(SIGNUP_COUNTRIES),
    state: faker.location.state(),
    city: faker.location.city(),
    zipcode: faker.location.zipCode('#####'),
    mobileNumber: faker.string.numeric({ length: 10, allowLeadingZeros: false }),
  });
}

/** Copia del perfil apta para reportes: la contraseña nunca sale censurada de aquí. */
export function redactProfile(profile: RegistrationProfile): Omit<
  RegistrationProfile,
  'password'
> & {
  password: '[REDACTED]';
} {
  return { ...profile, password: '[REDACTED]' };
}

const PASSWORD_ALPHABET = {
  lower: 'abcdefghijkmnopqrstuvwxyz',
  upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  digit: '23456789',
} as const;

/** Contraseña aleatoria (criptográfica). Nunca se deriva de la semilla ni la propone un LLM. */
export function generatePassword(length = 16): string {
  const pick = (chars: string) => chars.charAt(randomInt(chars.length));
  const all = PASSWORD_ALPHABET.lower + PASSWORD_ALPHABET.upper + PASSWORD_ALPHABET.digit;
  const required = [
    pick(PASSWORD_ALPHABET.lower),
    pick(PASSWORD_ALPHABET.upper),
    pick(PASSWORD_ALPHABET.digit),
  ];
  const rest = Array.from({ length: length - required.length }, () => pick(all));
  return [...required, ...rest].join('');
}
