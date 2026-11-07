import type { MiddlewareHandler } from 'hono';
import { getConnInfo } from '@hono/node-server/conninfo';

import { AppError } from '../../lib/errors';

interface Bucket {
  tokens: number;
  updatedAt: number;
}

/**
 * Límite de peticiones por IP con algoritmo de "token bucket".
 * Protege el endpoint de IA, que tiene costo por uso.
 * Nota: es en memoria; con varias instancias haría falta un almacén compartido (p. ej. Redis).
 */
export function rateLimit(options: {
  capacity: number;
  refillPerMinute: number;
}): MiddlewareHandler {
  const buckets = new Map<string, Bucket>();
  const refillPerMs = options.refillPerMinute / 60_000;

  return async (c, next) => {
    const ip = clientIp(c);
    const now = Date.now();
    const bucket = buckets.get(ip) ?? { tokens: options.capacity, updatedAt: now };

    bucket.tokens = Math.min(
      options.capacity,
      bucket.tokens + (now - bucket.updatedAt) * refillPerMs,
    );
    bucket.updatedAt = now;

    if (bucket.tokens < 1) {
      const retryAfterSeconds = Math.ceil((1 - bucket.tokens) / refillPerMs / 1000);
      c.header('Retry-After', String(retryAfterSeconds));
      throw new AppError(
        429,
        'RATE_LIMITED',
        'Demasiadas solicitudes. Intenta de nuevo en un momento.',
      );
    }

    bucket.tokens -= 1;
    buckets.set(ip, bucket);

    // Limpieza ocasional para que el mapa no crezca indefinidamente.
    if (buckets.size > 10_000) {
      for (const [key, value] of buckets) {
        if (now - value.updatedAt > 10 * 60_000) buckets.delete(key);
      }
    }

    await next();
  };
}

function clientIp(c: Parameters<MiddlewareHandler>[0]): string {
  try {
    return getConnInfo(c).remote.address ?? 'unknown';
  } catch {
    return 'unknown';
  }
}
