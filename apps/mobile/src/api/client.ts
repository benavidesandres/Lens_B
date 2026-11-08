import { ApiErrorSchema } from '@lens/shared';
import type { ZodType } from 'zod';

import { API_BASE_URL } from './config';

const REQUEST_TIMEOUT_MS = 30_000;

/** Error de red o de la API con un mensaje listo para mostrar al usuario. */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }

  // Errores 4xx no se reintentan: repetir la misma petición no cambiaría el resultado.
  get isRetryable(): boolean {
    return this.status === null || this.status >= 500 || this.status === 429;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  signal?: AbortSignal;
}

/**
 * Hace una petición a la API y valida la respuesta con el esquema compartido.
 * Si el servidor y la app se desincronizan, falla de forma explícita en lugar
 * de propagar datos mal formados por la interfaz.
 */
export async function apiRequest<T>(
  path: string,
  schema: ZodType<T>,
  { method = 'GET', query, body, signal }: RequestOptions = {},
): Promise<T> {
  const url = new URL(path, API_BASE_URL);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  // Se combina la cancelación externa (React Query) con un timeout propio.
  // No se usa AbortSignal.any/timeout porque no están garantizados en Hermes.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  signal?.addEventListener('abort', forwardAbort);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiRequestError(
      controller.signal.aborted
        ? 'El servidor tardó demasiado en responder.'
        : __DEV__
          ? `No pudimos conectar con ${API_BASE_URL}. Comprueba que el servidor esté activo y que el teléfono use la misma red Wi-Fi que el computador.`
          : 'No pudimos conectar con el servidor. Revisa tu conexión.',
      'NETWORK_ERROR',
      null,
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsed = ApiErrorSchema.safeParse(payload);
    throw new ApiRequestError(
      parsed.success ? parsed.data.error.message : 'El servidor respondió con un error.',
      parsed.success ? parsed.data.error.code : 'HTTP_ERROR',
      response.status,
    );
  }

  const result = schema.safeParse(payload);
  if (!result.success) {
    if (__DEV__) console.warn('Respuesta inesperada de la API', path, result.error.issues);
    throw new ApiRequestError(
      'Recibimos datos inesperados del servidor.',
      'INVALID_RESPONSE',
      response.status,
    );
  }
  return result.data;
}
