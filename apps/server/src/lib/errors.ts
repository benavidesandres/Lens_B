import type { ContentfulStatusCode } from 'hono/utils/http-status';

/**
 * Error de dominio con código estable y estado HTTP. Todo lo que no sea
 * AppError se trata como error interno y no se expone al cliente.
 */
export class AppError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'AppError';
  }
}

export class UpstreamError extends AppError {
  constructor(service: string, cause?: unknown) {
    super(502, 'UPSTREAM_UNAVAILABLE', `El servicio ${service} no respondió correctamente.`, {
      cause,
    });
    this.name = 'UpstreamError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado.') {
    super(404, 'NOT_FOUND', message);
    this.name = 'NotFoundError';
  }
}
