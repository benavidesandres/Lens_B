import { z } from 'zod';

// Velocidad media de caminata usada para estimar tiempos (≈ 4,8 km/h).
export const WALKING_METERS_PER_MINUTE = 80;

const EARTH_RADIUS_METERS = 6_371_000;

export const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});
export type Coordinates = z.infer<typeof CoordinatesSchema>;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * Distancia en metros entre dos puntos usando la fórmula de Haversine.
 * Suficientemente precisa para distancias urbanas a pie.
 */
export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

/**
 * Minutos estimados a pie. Se aplica un factor de 1,3 porque las calles
 * nunca siguen la línea recta entre dos puntos.
 */
export function walkingMinutes(meters: number): number {
  const STREET_DETOUR_FACTOR = 1.3;
  return Math.max(1, Math.round((meters * STREET_DETOUR_FACTOR) / WALKING_METERS_PER_MINUTE));
}
