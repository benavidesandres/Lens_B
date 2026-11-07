import { z } from 'zod';

import { CategorySchema } from './categories';

export const PlaceSourceSchema = z.enum(['wikipedia', 'osm']);

// Representación resumida de un lugar, usada en listas, mapa y rutas.
export const PlaceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: CategorySchema,
  // Subtipo legible, por ejemplo "Museo", "Mural" o "Mirador".
  kind: z.string().nullable(),
  lat: z.number(),
  lon: z.number(),
  distanceMeters: z.number().nonnegative(),
  walkMinutes: z.number().int().nonnegative(),
  summary: z.string().nullable(),
  imageUrl: z.url().nullable(),
  // Año o fecha de construcción tal como aparece en la fuente (p. ej. "1924").
  builtIn: z.string().nullable(),
  // null cuando la fuente no indica si la entrada es gratuita.
  isFree: z.boolean().nullable(),
  source: PlaceSourceSchema,
});
export type Place = z.infer<typeof PlaceSchema>;

export const PlaceDetailSchema = PlaceSchema.extend({
  description: z.string().nullable(),
  address: z.string().nullable(),
  openingHours: z.string().nullable(),
  website: z.url().nullable(),
  wikipediaUrl: z.url().nullable(),
});
export type PlaceDetail = z.infer<typeof PlaceDetailSchema>;

export const NEARBY_RADIUS = { min: 100, max: 3000, default: 1200 } as const;

// Los parámetros llegan como texto en la query string, por eso se usan coerciones.
export const NearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  radius: z.coerce
    .number()
    .int()
    .min(NEARBY_RADIUS.min)
    .max(NEARBY_RADIUS.max)
    .default(NEARBY_RADIUS.default),
  category: CategorySchema.optional(),
});
export type NearbyQuery = z.infer<typeof NearbyQuerySchema>;

export const NearbyResponseSchema = z.object({
  places: z.array(PlaceSchema),
});
export type NearbyResponse = z.infer<typeof NearbyResponseSchema>;
