import type { Place, RoutePlan } from '@lens/shared';

import type { JournalData, JournalPlace } from './journal-schema';

// Pasar varias veces por el mismo sitio en pocos minutos cuenta como una sola vez.
export const PASS_COOLDOWN_MS = 30 * 60 * 1000;
const MAX_SAVED_ROUTES = 30;

type PlaceRef = Pick<
  Place,
  'id' | 'name' | 'category' | 'kind' | 'lat' | 'lon' | 'imageUrl' | 'summary'
>;

export type JournalAction =
  | { type: 'hydrate'; data: JournalData }
  | { type: 'pass'; place: PlaceRef; at: number }
  | { type: 'open'; place: PlaceRef; at: number }
  | { type: 'visit'; place: PlaceRef; at: number; routeId?: string }
  | { type: 'saveRoute'; plan: RoutePlan; at: number }
  | { type: 'removeRoute'; routeId: string };

function upsert(
  data: JournalData,
  place: PlaceRef,
  at: number,
  patch: (entry: JournalPlace) => JournalPlace,
) {
  const existing: JournalPlace = data.places[place.id] ?? {
    placeId: place.id,
    name: place.name,
    category: place.category,
    kind: place.kind,
    lat: place.lat,
    lon: place.lon,
    imageUrl: place.imageUrl,
    summary: place.summary,
    firstSeenAt: at,
    passCount: 0,
    lastPassAt: null,
    openedAt: null,
    visitedAt: null,
  };
  // Se refrescan los datos descriptivos por si cambiaron en la fuente.
  const refreshed = {
    ...existing,
    name: place.name,
    imageUrl: place.imageUrl ?? existing.imageUrl,
    summary: place.summary ?? existing.summary,
  };
  return { ...data, places: { ...data.places, [place.id]: patch(refreshed) } };
}

/** Reductor puro del diario: fácil de probar y sin efectos secundarios. */
export function journalReducer(state: JournalData, action: JournalAction): JournalData {
  switch (action.type) {
    case 'hydrate':
      return action.data;

    case 'pass': {
      const previous = state.places[action.place.id];
      if (previous?.lastPassAt && action.at - previous.lastPassAt < PASS_COOLDOWN_MS) return state;
      return upsert(state, action.place, action.at, (entry) => ({
        ...entry,
        passCount: entry.passCount + 1,
        lastPassAt: action.at,
      }));
    }

    case 'open':
      return upsert(state, action.place, action.at, (entry) => ({
        ...entry,
        openedAt: entry.openedAt ?? action.at,
      }));

    case 'visit': {
      const next = upsert(state, action.place, action.at, (entry) => ({
        ...entry,
        visitedAt: entry.visitedAt ?? action.at,
      }));
      if (!action.routeId) return next;
      return {
        ...next,
        routes: next.routes.map((route) =>
          route.plan.id === action.routeId && !route.visitedStopIds.includes(action.place.id)
            ? { ...route, visitedStopIds: [...route.visitedStopIds, action.place.id] }
            : route,
        ),
      };
    }

    case 'saveRoute': {
      if (state.routes.some((route) => route.plan.id === action.plan.id)) return state;
      const saved = { plan: action.plan, savedAt: action.at, visitedStopIds: [] };
      return { ...state, routes: [saved, ...state.routes].slice(0, MAX_SAVED_ROUTES) };
    }

    case 'removeRoute':
      return { ...state, routes: state.routes.filter((route) => route.plan.id !== action.routeId) };
  }
}

export const isDiscovered = (entry: JournalPlace) =>
  entry.openedAt !== null || entry.visitedAt !== null;
