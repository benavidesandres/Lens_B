import { randomUUID } from 'node:crypto';

import {
  distanceMeters,
  walkingMinutes,
  type Coordinates,
  type Place,
  type RoutePlan,
} from '@lens/shared';

export interface PickedStop {
  place: Place;
  stayMinutes: number;
  note: string;
}

/** Tiempo de visita razonable según el tipo de lugar. */
export function defaultStayMinutes(place: Place): number {
  switch (place.kind) {
    case 'Museo':
    case 'Museo de arte':
      return 30;
    case 'Galería':
    case 'Centro cultural':
      return 20;
    case 'Mirador':
      return 10;
    case 'Mural':
    case 'Escultura':
    case 'Arte urbano':
    case 'Busto':
      return 5;
    default:
      break;
  }
  switch (place.category) {
    case 'food':
      return 25;
    case 'nature':
      return 15;
    case 'history':
      return 10;
    default:
      return 8;
  }
}

/** Minutos de un tramo a pie más la visita en destino. */
export function stepCost(from: Coordinates, place: Place, stayMinutes: number): number {
  return walkingMinutes(distanceMeters(from, place)) + stayMinutes;
}

/**
 * Recorta las paradas para que la ruta completa quepa en el presupuesto de tiempo.
 * Se toleran 10 minutos de margen para no descartar una parada por poco.
 */
export function fitToBudget(
  origin: Coordinates,
  stops: PickedStop[],
  budgetMinutes: number,
): PickedStop[] {
  const TOLERANCE_MINUTES = 10;
  const kept: PickedStop[] = [];
  let position = origin;
  let total = 0;

  for (const stop of stops) {
    const cost = stepCost(position, stop.place, stop.stayMinutes);
    if (total + cost > budgetMinutes + TOLERANCE_MINUTES) break;
    kept.push(stop);
    total += cost;
    position = stop.place;
  }
  return kept;
}

/**
 * Construye el plan final calculando tramos y totales en el servidor.
 * Nunca se confía en distancias o tiempos generados por el modelo.
 */
export function assembleRoute(
  origin: Coordinates,
  stops: PickedStop[],
  meta: Pick<RoutePlan, 'title' | 'summary' | 'engine'>,
): RoutePlan {
  let position = origin;
  let totalMeters = 0;
  let totalMinutes = 0;

  const routeStops = stops.map(({ place, stayMinutes, note }) => {
    const legMeters = Math.round(distanceMeters(position, place));
    const legMinutes = walkingMinutes(legMeters);
    totalMeters += legMeters;
    totalMinutes += legMinutes + stayMinutes;
    position = place;
    return { place, note, legMeters, legMinutes, stayMinutes };
  });

  return {
    id: randomUUID(),
    ...meta,
    totalMeters,
    totalMinutes,
    isFree: routeStops.every((stop) => stop.place.isFree === true),
    stops: routeStops,
    path: [],
  };
}
