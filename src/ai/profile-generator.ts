import { z } from 'zod';
import {
  generatePassword,
  type RegistrationProfile,
  RegistrationProfileSchema,
  SIGNUP_COUNTRIES,
} from '../data/registration-profile';
import { AiError, type AiClient } from './client';

/**
 * Lo que el modelo puede proponer. Esquema estricto: nunca correo, contraseña ni tarjeta
 * (esos datos los pone siempre el framework). El país es un texto libre a propósito: la
 * regla de negocio de los 7 países la aplica el framework, no el esquema del LLM.
 */
export const ProfileProposalSchema = z.strictObject({
  title: z.enum(['Mr', 'Mrs']),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  birthDay: z.int(),
  birthMonth: z.string().min(1),
  birthYear: z.int(),
  company: z.string().min(1),
  address1: z.string().min(1),
  address2: z.string().min(1),
  country: z.string().min(1),
  state: z.string().min(1),
  city: z.string().min(1),
  zipcode: z.string().min(1),
  mobileNumber: z.string().min(1),
});

export type ProfileProposal = z.infer<typeof ProfileProposalSchema>;

const SYSTEM_PROMPT = `Generas datos de prueba ficticios para el registro en una tienda online de pruebas.
- Inventa una persona que no exista: nunca uses personas reales ni datos personales reales.
- Devuelve solo los campos del esquema. No incluyas correo, contraseña ni datos de pago.
- title: "Mr" o "Mrs", coherente con el nombre. birthDay entre 1 y 28, birthMonth en inglés ("March"), birthYear entre 1950 y 2005.
- zipcode: solo letras, dígitos, espacios o guiones (3 a 10 caracteres). mobileNumber: exactamente 10 dígitos, sin prefijo ni símbolos.`;

export interface ProfileRequest {
  /** Correo único reservado por el framework (dominio example.com). */
  readonly email: string;
  /** País pedido al modelo; si se omite, el modelo elige entre los admitidos. */
  readonly country?: string;
  readonly maxAttempts?: number;
}

/**
 * La IA propone; el framework decide. Cada propuesta pasa por el esquema estricto y
 * después por las reglas de negocio de RegistrationProfileSchema (países admitidos,
 * correo en example.com, formatos). Solo se entrega un perfil que las cumple todas.
 * Los errores del proveedor no se reintentan aquí (el SDK ya reintenta 429/5xx).
 */
export async function generateAiRegistrationProfile(
  client: AiClient,
  request: ProfileRequest,
): Promise<RegistrationProfile> {
  const maxAttempts = request.maxAttempts ?? 2;
  const countryInstruction = request.country
    ? `País del perfil: ${request.country}.`
    : `Elige el país entre: ${SIGNUP_COUNTRIES.join(', ')}.`;
  const rejections: string[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const proposal = await client.structured({
      operation: 'generateRegistrationProfile',
      system: SYSTEM_PROMPT,
      user: `${countryInstruction} Genera un perfil de usuario ficticio.`,
      schema: ProfileProposalSchema,
      maxTokens: 4096,
    });

    const candidate = RegistrationProfileSchema.safeParse({
      title: proposal.title,
      name: `${proposal.firstName} ${proposal.lastName}`,
      email: request.email,
      password: generatePassword(),
      birthDate: { day: proposal.birthDay, month: proposal.birthMonth, year: proposal.birthYear },
      firstName: proposal.firstName,
      lastName: proposal.lastName,
      company: proposal.company,
      address1: proposal.address1,
      address2: proposal.address2,
      country: proposal.country,
      state: proposal.state,
      city: proposal.city,
      zipcode: proposal.zipcode,
      mobileNumber: proposal.mobileNumber,
    });
    if (candidate.success) return candidate.data;
    // Solo se registran rutas y mensajes de Zod: nunca la contraseña generada.
    rejections.push(
      `intento ${String(attempt)}: ${candidate.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
    );
  }

  throw new AiError(
    'rejected',
    `perfil rechazado por las reglas de negocio tras ${String(maxAttempts)} intentos (${rejections.join(' | ')})`,
  );
}
