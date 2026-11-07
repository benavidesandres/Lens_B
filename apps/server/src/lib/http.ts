import { UpstreamError } from './errors';

export interface HttpClientOptions {
  userAgent: string;
  timeoutMs?: number;
}

export type HttpClient = <T>(url: string | URL, init?: RequestInit) => Promise<T>;

/**
 * Cliente HTTP para servicios externos: añade User-Agent, aplica timeout
 * y convierte cualquier fallo en UpstreamError.
 */
export function createHttpClient(service: string, options: HttpClientOptions): HttpClient {
  const timeoutMs = options.timeoutMs ?? 15_000;

  return async <T>(url: string | URL, init: RequestInit = {}): Promise<T> => {
    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        headers: {
          Accept: 'application/json',
          'User-Agent': options.userAgent,
          ...init.headers,
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (cause) {
      throw new UpstreamError(service, cause);
    }

    if (!response.ok) {
      throw new UpstreamError(service, new Error(`HTTP ${response.status}`));
    }

    try {
      return (await response.json()) as T;
    } catch (cause) {
      throw new UpstreamError(service, cause);
    }
  };
}
