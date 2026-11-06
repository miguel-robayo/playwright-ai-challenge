import { createHash } from 'node:crypto';

/**
 * Componentes de la semilla de datos de un escenario.
 * Regla: semilla = TEST_RUN_ID + testId + retry + repeatEachIndex + índice del dato
 * dentro del test. Misma combinación → mismos datos; cualquier componente distinto →
 * datos distintos.
 */
export interface SeedParts {
  readonly runId: string;
  readonly testId: string;
  readonly retry: number;
  readonly repeatEachIndex: number;
  /** Posición del dato generado dentro del test (0 = primero). */
  readonly index: number;
}

/** Clave textual de la semilla. No contiene credenciales y puede adjuntarse al reporte. */
export function seedKey(parts: SeedParts): string {
  return [parts.runId, parts.testId, parts.retry, parts.repeatEachIndex, parts.index].join(':');
}

/** Huella hexadecimal de la semilla, estable y apta para identificadores (correo). */
export function seedDigest(parts: SeedParts, length = 12): string {
  return createHash('sha256').update(seedKey(parts)).digest('hex').slice(0, length);
}

/** Semilla numérica para Faker, derivada de la misma clave. */
export function seedNumber(parts: SeedParts): number {
  return createHash('sha256').update(seedKey(parts)).digest().readUInt32BE(0);
}
