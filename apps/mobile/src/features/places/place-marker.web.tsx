import type { Place } from '@lens/shared';

export interface PlaceMarkerProps {
  place: Place;
  selected?: boolean;
  order?: number;
  onPress?: (place: Place) => void;
}

// Sin mapa en web no hay marcadores que dibujar.
export function PlaceMarker(_props: PlaceMarkerProps) {
  return null;
}
