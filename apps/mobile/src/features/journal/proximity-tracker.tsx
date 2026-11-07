import { distanceMeters } from '@lens/shared';
import { useEffect } from 'react';

import { useNearbyPlaces } from '@/api/queries';
import { useLocation } from '@/features/location/location-provider';

import { useJournal } from './journal-provider';

// Radio en el que se considera que el usuario "pasó frente" a un lugar.
const PASS_RADIUS_METERS = 35;

/**
 * Componente sin interfaz que registra en el diario los lugares por los que
 * pasa el usuario. Comparte la caché de lugares cercanos con la pantalla de inicio.
 */
export function ProximityTracker() {
  const { coords } = useLocation();
  const { ready, recordPass } = useJournal();
  const { data: places } = useNearbyPlaces(coords);

  useEffect(() => {
    if (!ready || !coords || !places) return;
    for (const place of places) {
      if (distanceMeters(coords, place) <= PASS_RADIUS_METERS) recordPass(place);
    }
  }, [coords, places, ready, recordPass]);

  return null;
}
