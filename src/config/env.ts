import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

/**
 * Perfiles de ejecución seleccionados con TEST_ENV.
 * Solo cambian CÓMO se ejecuta la suite, nunca QUÉ proyectos existen.
 */
const PROFILES = {
  local: { workers: undefined, retries: 0, forbidOnly: false },
  ci: { workers: 2, retries: 1, forbidOnly: true },
} as const satisfies Record<string, ExecutionProfile>;

interface ExecutionProfile {
  /** `undefined` deja que Playwright use su valor por defecto. */
  readonly workers: number | undefined;
  readonly retries: number;
  readonly forbidOnly: boolean;
}

export type TestEnvName = keyof typeof PROFILES;

/** Una variable vacía en .env (`AI_API_KEY=`) equivale a no definida. */
const optionalText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().optional(),
);

const EnvSchema = z.object({
  TEST_ENV: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.enum(['local', 'ci']).optional(),
  ),
  CI: optionalText,
  BASE_URL: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.url({ protocol: /^https?$/ }).default('https://automationexercise.com'),
  ),
  AI_PROVIDER: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.literal('anthropic').default('anthropic'),
  ),
  AI_API_KEY: optionalText,
  AI_MODEL: optionalText,
});

export interface Env {
  readonly testEnv: TestEnvName;
  readonly profile: ExecutionProfile;
  readonly baseURL: string;
  readonly ai: {
    readonly provider: 'anthropic';
    readonly apiKey: string | undefined;
    readonly model: string | undefined;
  };
}

const ENV_FILE = path.resolve(import.meta.dirname, '..', '..', '.env');

/**
 * Carga `.env` (si existe) y valida las variables con Zod.
 * Las variables ya definidas en el proceso tienen prioridad sobre el archivo, por lo que
 * llamarla varias veces es seguro: no se guarda estado entre llamadas.
 * Una configuración inválida detiene la ejecución con un mensaje claro.
 */
export function loadEnv(): Env {
  if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Configuración de entorno inválida:\n${z.prettifyError(parsed.error)}`);
  }

  const vars = parsed.data;
  const testEnv: TestEnvName = vars.TEST_ENV ?? (vars.CI ? 'ci' : 'local');

  return {
    testEnv,
    profile: PROFILES[testEnv],
    baseURL: vars.BASE_URL,
    ai: { provider: vars.AI_PROVIDER, apiKey: vars.AI_API_KEY, model: vars.AI_MODEL },
  };
}
