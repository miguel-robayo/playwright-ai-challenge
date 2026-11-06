import type { z } from 'zod';

/** Motivo por el que una llamada de IA no produjo un resultado utilizable. */
export type AiErrorKind =
  | 'auth'
  | 'rate_limit'
  | 'timeout'
  | 'server'
  | 'provider'
  | 'max_tokens'
  | 'refusal'
  | 'invalid_output'
  | 'rejected'
  | 'call_limit';

/**
 * Error de IA. Ningún fallo del proveedor se convierte en un resultado: siempre se lanza.
 * El mensaje nunca incluye la API key ni el cuerpo de la petición.
 */
export class AiError extends Error {
  constructor(
    readonly kind: AiErrorKind,
    message: string,
  ) {
    super(`[IA:${kind}] ${message}`);
    this.name = 'AiError';
  }
}

/** Registro de una llamada, apto para el reporte (sin clave ni prompts completos). */
export interface AiCallRecord {
  readonly operation: string;
  readonly model: string;
  readonly durationMs: number;
  readonly outcome: 'ok' | AiErrorKind;
  readonly stopReason?: string | null;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly output?: unknown;
}

export interface StructuredRequest<T> {
  readonly operation: string;
  readonly system: string;
  readonly user: string;
  readonly schema: z.ZodType<T>;
  readonly maxTokens: number;
}

/** Cliente de IA del framework: una única operación, respuesta estructurada validada con Zod. */
export interface AiClient {
  readonly model: string;
  readonly calls: readonly AiCallRecord[];
  structured<T>(request: StructuredRequest<T>): Promise<T>;
}

export interface AiClientOptions {
  readonly apiKey: string;
  readonly model: string;
  readonly timeoutMs: number;
  /** Máximo de llamadas que puede hacer un test: evita consumo descontrolado. */
  readonly maxCalls: number;
  readonly maxRetries?: number;
  /** Solo para pruebas: transporte HTTP simulado (sin red). */
  readonly fetch?: typeof fetch;
}

/**
 * Crea el cliente sobre el SDK oficial de Anthropic. El SDK se importa aquí, de forma
 * dinámica: ningún módulo lo carga hasta que un test pide el cliente, así que la suite
 * funcional nunca lo importa.
 */
export async function createAiClient(options: AiClientOptions): Promise<AiClient> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const { zodOutputFormat } = await import('@anthropic-ai/sdk/helpers/zod');

  // La clave se pasa siempre de forma explícita: el cliente no busca credenciales en otro sitio.
  const sdk = new Anthropic({
    apiKey: options.apiKey,
    timeout: options.timeoutMs,
    maxRetries: options.maxRetries ?? 1,
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });
  const calls: AiCallRecord[] = [];

  const toAiError = (error: unknown): AiError => {
    if (error instanceof AiError) return error;
    if (error instanceof Anthropic.AuthenticationError)
      return new AiError('auth', 'credenciales rechazadas (401)');
    if (error instanceof Anthropic.RateLimitError)
      return new AiError('rate_limit', 'límite de uso alcanzado (429)');
    if (error instanceof Anthropic.APIConnectionTimeoutError)
      return new AiError('timeout', `sin respuesta en ${String(options.timeoutMs)} ms`);
    if (error instanceof Anthropic.InternalServerError)
      return new AiError('server', `error del proveedor (${String(error.status)})`);
    if (error instanceof Anthropic.APIError)
      return new AiError(
        'provider',
        `error del proveedor (${String(error.status ?? 'sin estado')})`,
      );
    return new AiError('provider', error instanceof Error ? error.name : 'error desconocido');
  };

  return {
    model: options.model,
    calls,
    async structured<T>(request: StructuredRequest<T>): Promise<T> {
      if (calls.length >= options.maxCalls) {
        throw new AiError('call_limit', `máximo de ${String(options.maxCalls)} llamadas por test`);
      }
      const start = Date.now();
      const record = (entry: Omit<AiCallRecord, 'operation' | 'model' | 'durationMs'>) =>
        calls.push({
          operation: request.operation,
          model: options.model,
          durationMs: Date.now() - start,
          ...entry,
        });

      let message;
      try {
        message = await sdk.messages.create({
          model: options.model,
          max_tokens: request.maxTokens,
          system: request.system,
          messages: [{ role: 'user', content: request.user }],
          output_config: { format: zodOutputFormat(request.schema), effort: 'low' },
        });
      } catch (error) {
        const aiError = toAiError(error);
        record({ outcome: aiError.kind });
        throw aiError;
      }

      const usage = {
        stopReason: message.stop_reason,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      };
      const fail = (kind: AiErrorKind, detail: string): never => {
        record({ outcome: kind, ...usage });
        throw new AiError(kind, detail);
      };

      // stop_reason se comprueba antes de interpretar el contenido.
      if (message.stop_reason === 'refusal') fail('refusal', 'el modelo rechazó la petición');
      if (message.stop_reason === 'max_tokens') {
        fail('max_tokens', `respuesta truncada en ${String(request.maxTokens)} tokens`);
      }

      const text = message.content
        .flatMap((block) => (block.type === 'text' ? [block.text] : []))
        .join('');
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        fail('invalid_output', 'la respuesta no es JSON válido');
      }
      // El framework valida siempre, aunque el proveedor haya aplicado el esquema.
      const parsed = request.schema.safeParse(json);
      if (!parsed.success) fail('invalid_output', 'la respuesta no cumple el esquema esperado');

      const output = (parsed as { data: T }).data;
      record({ outcome: 'ok', ...usage, output });
      return output;
    },
  };
}
