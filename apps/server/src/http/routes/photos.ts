import { Hono } from 'hono';

import { TtlCache } from '../../lib/cache';
import { NotFoundError } from '../../lib/errors';
import type { GooglePlacesProvider } from '../../providers/google-places';
import { rateLimit } from '../middleware/rate-limit';

const ID = /^[\w-]{1,600}$/;
// Cada foto resuelta cuesta una llamada a Google: se reutiliza durante un tiempo.
const PHOTO_TTL_MS = 6 * 60 * 60 * 1000;

/** Proxy de fotos de Google Places: redirige a la imagen pública sin revelar la clave. */
export function photoRoutes(google: GooglePlacesProvider) {
  const cache = new TtlCache<string>(PHOTO_TTL_MS, 2000);

  return new Hono().get(
    '/:placeId/:photoId',
    // Una pantalla carga muchas miniaturas a la vez: el límite es más holgado que en rutas.
    rateLimit({ capacity: 120, refillPerMinute: 120 }),
    async (c) => {
      const { placeId, photoId } = c.req.param();
      if (!ID.test(placeId) || !ID.test(photoId)) throw new NotFoundError('Foto no encontrada.');

      const name = `places/${placeId}/photos/${photoId}`;
      const url = await cache.getOrLoad(name, async () => {
        const resolved = await google.photoUrl(name);
        if (!resolved) throw new NotFoundError('Foto no encontrada.');
        return resolved;
      });
      // El teléfono guarda la imagen en caché; no vuelve a pedirla en horas.
      c.header('Cache-Control', 'public, max-age=21600');
      return c.redirect(url, 302);
    },
  );
}
