import { CATEGORY_LABELS, type Category, type Coordinates, type Place } from '@lens/shared';

import { defaultStayMinutes, stepCost, type PickedStop } from './assemble';
import type { RouteIntent } from './intent';

const MAX_STOPS = 6;

const ROUTE_TITLES: Record<Category, string> = {
  art: 'Ruta de arte',
  history: 'Ruta histórica',
  food: 'Ruta gastronómica',
  nature: 'Ruta verde',
  hidden: 'Ruta de rincones poco conocidos',
};

/**
 * Planificador local sin IA. Usa una estrategia voraz: en cada paso elige
 * el lugar con mejor relación interés/tiempo desde la posición actual,
 * hasta agotar el presupuesto de minutos.
 */
export function planHeuristic(
  origin: Coordinates,
  places: Place[],
  intent: RouteIntent,
): { stops: PickedStop[]; title: string; summary: string } {
  const pool = selectPool(places, intent);
  const stops: PickedStop[] = [];
  const usedKinds = new Map<string, number>();
  let position = origin;
  let elapsed = 0;

  while (stops.length < MAX_STOPS) {
    let best: { place: Place; stay: number; ratio: number; cost: number } | null = null;

    for (const place of pool) {
      if (stops.some((stop) => stop.place.id === place.id)) continue;
      const stay = defaultStayMinutes(place);
      const cost = stepCost(position, place, stay);
      if (elapsed + cost > intent.minutes) continue;

      // Se penaliza repetir el mismo tipo de lugar para dar variedad a la ruta.
      const repetitions = usedKinds.get(place.kind ?? place.category) ?? 0;
      const value = interest(place, intent) / (1 + repetitions);
      const ratio = value / cost;
      if (!best || ratio > best.ratio) best = { place, stay, ratio, cost };
    }

    if (!best) break;
    stops.push({ place: best.place, stayMinutes: best.stay, note: describe(best.place) });
    usedKinds.set(
      best.place.kind ?? best.place.category,
      (usedKinds.get(best.place.kind ?? best.place.category) ?? 0) + 1,
    );
    elapsed += best.cost;
    position = best.place;
  }

  return { stops, title: buildTitle(intent), summary: buildSummary(intent, stops.length) };
}

function selectPool(places: Place[], intent: RouteIntent): Place[] {
  // Un lugar cerrado ahora no sirve para una ruta inmediata.
  let pool = places.filter((place) => place.openNow !== false);
  if (intent.categories.length > 0) {
    const matching = pool.filter((place) => intent.categories.includes(place.category));
    // Si casi no hay lugares de esa categoría, se completa con el resto.
    if (matching.length >= 2) pool = matching;
  }
  if (intent.freeOnly) {
    const surelyFree = pool.filter((place) => place.isFree === true);
    // Solo se admiten lugares de gratuidad desconocida si no hay suficientes confirmados.
    pool = surelyFree.length >= 3 ? surelyFree : pool.filter((place) => place.isFree !== false);
  }
  return pool;
}

/** Puntuación de interés: un lugar con historia y foto invita más a visitarlo. */
function interest(place: Place, intent: RouteIntent): number {
  let score = 1;
  if (place.summary) score += 1;
  if (place.imageUrl) score += 0.5;
  if (place.builtIn) score += 0.5;
  if (intent.categories.includes(place.category)) score += 2;
  if (intent.freeOnly && place.isFree === true) score += 0.5;
  // Calificación de Google, ponderada por el número de reseñas para no premiar un 5,0 con 2 votos.
  if (place.rating !== null && place.ratingCount !== null && place.ratingCount >= 5) {
    score += ((place.rating - 3.5) / 1.5) * Math.min(1, place.ratingCount / 100);
  }
  return score;
}

function describe(place: Place): string {
  if (place.summary) {
    const firstSentence = place.summary.split(/(?<=\.)\s/)[0] ?? place.summary;
    return firstSentence.length <= 160 ? firstSentence : `${firstSentence.slice(0, 157)}…`;
  }
  const label = place.kind ?? CATEGORY_LABELS[place.category];
  return place.builtIn ? `${label} de ${place.builtIn}.` : `${label}.`;
}

function buildTitle(intent: RouteIntent): string {
  const [first, ...rest] = intent.categories;
  const base = first && rest.length === 0 ? ROUTE_TITLES[first] : 'Ruta de descubrimiento';
  return intent.freeOnly ? `${base} gratuita` : base;
}

function buildSummary(intent: RouteIntent, stopCount: number): string {
  if (stopCount === 0) return 'No encontramos lugares que encajen con tu petición en esta zona.';
  const free = intent.freeOnly ? ', sin costos de entrada conocidos' : '';
  return `${stopCount} paradas pensadas para unos ${intent.minutes} minutos a pie${free}.`;
}
