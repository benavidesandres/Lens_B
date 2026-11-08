import { z } from 'zod';

import { CategorySchema } from './categories';

export const PlaceSourceSchema = z.enum(['wikipedia', 'osm', 'google']);

// Nivel de precio de Google: 0 gratis, 1 económico, 2 moderado, 3 caro, 4 muy caro.
export const PriceLevelSchema = z.number().int().min(0).max(4);
export type PriceLevel = z.infer<typeof PriceLevelSchema>;

// Rango aproximado de gasto por persona, en la moneda local (p. ej. COP).
export const PriceRangeSchema = z.object({
  min: z.number().nonnegative().nullable(),
  max: z.number().nonnegative().nullable(),
  currency: z.string().length(3),
});
export type PriceRange = z.infer<typeof PriceRangeSchema>;

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
  // Los campos siguientes solo los aporta Google; con default(null) las rutas
  // guardadas en el teléfono antes de añadirlos siguen siendo válidas.
  rating: z.number().min(0).max(5).nullable().default(null),
  ratingCount: z.number().int().nonnegative().nullable().default(null),
  priceLevel: PriceLevelSchema.nullable().default(null),
  priceRange: PriceRangeSchema.nullable().default(null),
  // null cuando no se conoce el horario.
  openNow: z.boolean().nullable().default(null),
  source: PlaceSourceSchema,
});
export type Place = z.infer<typeof PlaceSchema>;

export const PlaceDetailSchema = PlaceSchema.extend({
  description: z.string().nullable(),
  address: z.string().nullable(),
  openingHours: z.string().nullable(),
  website: z.url().nullable(),
  wikipediaUrl: z.url().nullable(),
  phone: z.string().nullable().default(null),
  mapsUrl: z.url().nullable().default(null),
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
