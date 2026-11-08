import type { Coordinates } from '@lens/shared';
import * as Location from 'expo-location';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Linking } from 'react-native';

export type LocationStatus = 'pending' | 'granted' | 'denied' | 'unavailable';

interface LocationContextValue {
  status: LocationStatus;
  coords: Coordinates | null;
  // false cuando el sistema ya no mostrará el diálogo y hay que ir a Ajustes.
  canAskAgain: boolean;
  requestPermission: () => Promise<void>;
  openSettings: () => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

// Solo se notifica un cambio cuando el usuario se ha movido de verdad.
const DISTANCE_INTERVAL_METERS = 20;

export function LocationProvider({
  children,
  enabled,
}: {
  children: ReactNode;
  // Mientras sea false no se pide el permiso ni se usa el GPS.
  enabled: boolean;
}) {
  const [status, setStatus] = useState<LocationStatus>('pending');
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const subscription = useRef<Location.LocationSubscription | null>(null);

  const startWatching = useCallback(async () => {
    if (subscription.current) return;
    try {
      // La última posición conocida es instantánea; sirve para pintar algo mientras llega la precisa.
      const last = await Location.getLastKnownPositionAsync();
      if (last) setCoords({ lat: last.coords.latitude, lon: last.coords.longitude });

      subscription.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: DISTANCE_INTERVAL_METERS },
        (position) => setCoords({ lat: position.coords.latitude, lon: position.coords.longitude }),
        () => setStatus('unavailable'),
      );
      setStatus('granted');
    } catch {
      setStatus('unavailable');
    }
  }, []);

  const applyPermission = useCallback(
    async (response: Location.LocationPermissionResponse) => {
      setCanAskAgain(response.canAskAgain);
      if (response.granted) await startWatching();
      else setStatus('denied');
    },
    [startWatching],
  );

  const requestPermission = useCallback(async () => {
    await applyPermission(await Location.requestForegroundPermissionsAsync());
  }, [applyPermission]);

  useEffect(() => {
    if (!enabled) return;
    // Al iniciar solo se consulta el permiso; el diálogo lo dispara el usuario desde la interfaz.
    Location.getForegroundPermissionsAsync()
      .then((response) => (response.granted ? applyPermission(response) : requestPermission()))
      .catch(() => setStatus('unavailable'));

    // Si el usuario concede el permiso en Ajustes y vuelve a la app, se reanuda solo.
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active' && !subscription.current) {
        Location.getForegroundPermissionsAsync()
          .then((response) => {
            if (response.granted) return applyPermission(response);
          })
          .catch(() => undefined);
      }
    });

    return () => {
      appState.remove();
      subscription.current?.remove();
      subscription.current = null;
    };
  }, [enabled, applyPermission, requestPermission]);

  const value = useMemo<LocationContextValue>(
    () => ({
      status,
      coords,
      canAskAgain,
      requestPermission,
      openSettings: () => void Linking.openSettings(),
    }),
    [status, coords, canAskAgain, requestPermission],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation(): LocationContextValue {
  const context = useContext(LocationContext);
  if (!context) throw new Error('useLocation debe usarse dentro de LocationProvider');
  return context;
}
