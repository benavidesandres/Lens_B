import { z } from 'zod';

import { CoordinatesSchema } from './geo';
import { PlaceSchema } from './places';

export const RoutePlanRequestSchema = CoordinatesSchema.extend({
  // Petición libre del usuario: "Tengo una hora libre y no quiero gastar dinero".
  prompt: z.string().trim().min(3).max(500),
});
export type RoutePlanRequest = z.infer<typeof RoutePlanRequestSchema>;

export const RouteStopSchema = z.object({
  place: PlaceSchema,
  // Por qué esta parada encaja en la ruta.
  note: z.string(),
  // Tramo a pie desde la parada anterior (o desde el usuario si es la primera).
  legMeters: z.number().nonnegative(),
  legMinutes: z.number().int().nonnegative(),
  // Tiempo sugerido de permanencia en el lugar.
  stayMinutes: z.number().int().nonnegative(),
});
export type RouteStop = z.infer<typeof RouteStopSchema>;

// "ai" si la ruta la compuso el modelo; "heuristic" si se usó el planificador local.
export const RouteEngineSchema = z.enum(['ai', 'heuristic']);

export const RoutePlanSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  totalMinutes: z.number().int().nonnegative(),
  totalMeters: z.number().nonnegative(),
  isFree: z.boolean(),
  stops: z.array(RouteStopSchema),
  engine: RouteEngineSchema,
  // Trazado real por calles (Google Routes). Vacío si no se pudo calcular:
  // la app une entonces las paradas en línea recta.
  path: z.array(CoordinatesSchema).default([]),
});
export type RoutePlan = z.infer<typeof RoutePlanSchema>;
