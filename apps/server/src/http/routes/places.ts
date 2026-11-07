import { CoordinatesSchema, NearbyQuerySchema, type NearbyResponse } from '@lens/shared';
import { Hono } from 'hono';
import { z } from 'zod';

import type { PlacesService } from '../../services/places-service';
import { validate } from '../validation';

const DetailQuerySchema = z.object({
  lat: z.coerce.number().optional(),
  lon: z.coerce.number().optional(),
});

export function placesRoutes(places: PlacesService) {
  return new Hono()
    .get('/nearby', validate('query', NearbyQuerySchema), async (c) => {
      const query = c.req.valid('query');
      const body: NearbyResponse = { places: await places.nearby(query) };
      // Los lugares cambian poco: el cliente puede reutilizar la respuesta unos minutos.
      c.header('Cache-Control', 'private, max-age=300');
      return c.json(body);
    })
    .get('/:id', validate('query', DetailQuerySchema), async (c) => {
      const { lat, lon } = c.req.valid('query');
      const origin = CoordinatesSchema.safeParse({ lat, lon });
      const detail = await places.detail(
        c.req.param('id'),
        origin.success ? origin.data : undefined,
      );
      c.header('Cache-Control', 'private, max-age=600');
      return c.json(detail);
    });
}
