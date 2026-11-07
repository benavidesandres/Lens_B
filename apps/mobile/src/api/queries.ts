import {
  NearbyResponseSchema,
  PlaceDetailSchema,
  RoutePlanSchema,
  type Category,
  type Coordinates,
  type Place,
  type RoutePlan,
  type RoutePlanRequest,
} from '@lens/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiRequest } from './client';

/**
 * Las coordenadas se redondean (~100 m) para las claves de caché: así, moverse
 * unos pasos no dispara una nueva petición.
 */
const roundCoord = (value: number) => Math.round(value * 1000) / 1000;

export const queryKeys = {
  nearby: (coords: Coordinates | null, radius: number, category?: Category) =>
    [
      'places',
      'nearby',
      coords && roundCoord(coords.lat),
      coords && roundCoord(coords.lon),
      radius,
      category ?? 'all',
    ] as const,
  place: (id: string) => ['places', 'detail', id] as const,
  routePlan: (id: string) => ['route-plans', id] as const,
};

export function useNearbyPlaces(
  coords: Coordinates | null,
  options: { radius?: number; category?: Category } = {},
) {
  const radius = options.radius ?? 1200;
  return useQuery({
    queryKey: queryKeys.nearby(coords, radius, options.category),
    enabled: coords !== null,
    // El tipo explícito evita que TanStack infiera mal el tipo por placeholderData.
    queryFn: ({ signal }): Promise<Place[]> =>
      apiRequest('/v1/places/nearby', NearbyResponseSchema, {
        query: {
          lat: roundCoord(coords!.lat),
          lon: roundCoord(coords!.lon),
          radius,
          category: options.category,
        },
        signal,
      }).then((response) => response.places),
    // Mantiene los resultados anteriores visibles mientras llegan los nuevos (sin parpadeos).
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlaceDetail(id: string, coords: Coordinates | null) {
  return useQuery({
    queryKey: queryKeys.place(id),
    queryFn: ({ signal }) =>
      apiRequest(`/v1/places/${encodeURIComponent(id)}`, PlaceDetailSchema, {
        query: coords ? { lat: coords.lat, lon: coords.lon } : undefined,
        signal,
      }),
    staleTime: 30 * 60 * 1000,
  });
}

/** Solicita una ruta y la guarda en caché para que la pantalla de la ruta la lea por id. */
export function usePlanRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: RoutePlanRequest) =>
      apiRequest('/v1/route-plans', RoutePlanSchema, { method: 'POST', body: request }),
    onSuccess: (plan) => {
      queryClient.setQueryData(queryKeys.routePlan(plan.id), plan);
    },
  });
}

/** Ruta generada previamente (en esta sesión o guardada en el diario). */
export function useRoutePlan(id: string, fallback?: RoutePlan) {
  return useQuery({
    queryKey: queryKeys.routePlan(id),
    // Las rutas no se vuelven a pedir al servidor: viven en caché o en el diario.
    queryFn: () => fallback ?? Promise.reject(new Error('Ruta no disponible.')),
    initialData: fallback,
    staleTime: Infinity,
    retry: false,
  });
}
