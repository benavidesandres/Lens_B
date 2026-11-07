import { CategorySchema, RoutePlanSchema } from '@lens/shared';
import { z } from 'zod';

// Lo que la app recuerda de cada lugar con el que el usuario ha interactuado.
export const JournalPlaceSchema = z.object({
  placeId: z.string(),
  name: z.string(),
  category: CategorySchema,
  kind: z.string().nullable(),
  lat: z.number(),
  lon: z.number(),
  imageUrl: z.string().nullable(),
  summary: z.string().nullable(),
  firstSeenAt: z.number(),
  // Veces que el usuario pasó cerca sin necesariamente abrir el lugar.
  passCount: z.number().int().nonnegative(),
  lastPassAt: z.number().nullable(),
  // Momento en que abrió la ficha: a partir de ahí cuenta como "descubierto".
  openedAt: z.number().nullable(),
  // Momento en que estuvo físicamente allí durante una ruta.
  visitedAt: z.number().nullable(),
});
export type JournalPlace = z.infer<typeof JournalPlaceSchema>;

export const SavedRouteSchema = z.object({
  plan: RoutePlanSchema,
  savedAt: z.number(),
  visitedStopIds: z.array(z.string()),
});
export type SavedRoute = z.infer<typeof SavedRouteSchema>;

export const JournalDataSchema = z.object({
  version: z.literal(1),
  places: z.record(z.string(), JournalPlaceSchema),
  routes: z.array(SavedRouteSchema),
});
export type JournalData = z.infer<typeof JournalDataSchema>;

export const EMPTY_JOURNAL: JournalData = { version: 1, places: {}, routes: [] };
