import type { Place } from '@lens/shared';
import type { Context } from 'hono';

import { GOOGLE_PHOTO_PREFIX } from '../providers/google-places';

const PHOTO_NAME = /^places\/([\w-]+)\/photos\/([\w-]+)$/;

/** Origen público con el que el cliente llegó al servidor (respeta proxies inversos). */
export function publicOrigin(c: Context): string {
  const url = new URL(c.req.url);
  const proto =
    c.req.header('x-forwarded-proto')?.split(',')[0]?.trim() ?? url.protocol.replace(':', '');
  const host = c.req.header('x-forwarded-host')?.split(',')[0]?.trim() ?? url.host;
  return `${proto}://${host}`;
}

/**
 * Convierte la referencia interna de una foto de Google en una URL del propio
 * servidor (/v1/photos/...), que la resuelve sin exponer la clave.
 */
export function withPublicPhoto<T extends Pick<Place, 'imageUrl'>>(place: T, origin: string): T {
  if (!place.imageUrl?.startsWith(GOOGLE_PHOTO_PREFIX)) return place;
  const match = PHOTO_NAME.exec(place.imageUrl.slice(GOOGLE_PHOTO_PREFIX.length));
  return {
    ...place,
    imageUrl: match ? `${origin}/v1/photos/${match[1]}/${match[2]}` : null,
  };
}
