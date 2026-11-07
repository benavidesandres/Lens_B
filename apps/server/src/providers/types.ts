import type { Category, Place } from '@lens/shared';

/**
 * Lugar tal como lo entrega un proveedor, antes de calcular distancias.
 * `wikipediaTitle` permite fusionar un elemento de OSM con su artículo.
 */
export type PlaceCandidate = Omit<Place, 'distanceMeters' | 'walkMinutes'> & {
  wikipediaTitle: string | null;
};

export interface Classification {
  category: Category;
  kind: string | null;
}
