import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Place, RoutePlan } from '@lens/shared';
import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';

import { journalReducer } from './journal-reducer';
import { EMPTY_JOURNAL, JournalDataSchema, type JournalData } from './journal-schema';

const STORAGE_KEY = 'lens.journal.v1';
const PERSIST_DEBOUNCE_MS = 500;

type PlaceRef = Pick<
  Place,
  'id' | 'name' | 'category' | 'kind' | 'lat' | 'lon' | 'imageUrl' | 'summary'
>;

interface JournalContextValue {
  data: JournalData;
  ready: boolean;
  recordPass: (place: PlaceRef) => void;
  recordOpen: (place: PlaceRef) => void;
  recordVisit: (place: PlaceRef, routeId?: string) => void;
  saveRoute: (plan: RoutePlan) => void;
  removeRoute: (routeId: string) => void;
}

const JournalContext = createContext<JournalContextValue | null>(null);

/**
 * Diario local del usuario. Todo se guarda en el dispositivo: la app no
 * necesita cuenta ni envía el historial de ubicaciones a ningún servidor.
 */
export function JournalProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(journalReducer, EMPTY_JOURNAL);
  const [ready, setReady] = useReducerFlag();

  // Carga inicial desde almacenamiento; si los datos están corruptos se empieza de cero.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JournalDataSchema.safeParse(JSON.parse(raw));
        if (parsed.success) dispatch({ type: 'hydrate', data: parsed.data });
      })
      .catch(() => undefined)
      .finally(setReady);
  }, [setReady]);

  // Persistencia con debounce para no escribir en disco en cada actualización de GPS.
  // No se escribe nada hasta terminar de leer, para no sobrescribir datos guardados.
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => undefined);
    }, PERSIST_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [data, ready]);

  // Las acciones son estables: los efectos que dependen de ellas no se re-ejecutan sin motivo.
  const actions = useMemo(
    () => ({
      recordPass: (place: PlaceRef) => dispatch({ type: 'pass', place, at: Date.now() }),
      recordOpen: (place: PlaceRef) => dispatch({ type: 'open', place, at: Date.now() }),
      recordVisit: (place: PlaceRef, routeId?: string) =>
        dispatch({ type: 'visit', place, routeId, at: Date.now() }),
      saveRoute: (plan: RoutePlan) => dispatch({ type: 'saveRoute', plan, at: Date.now() }),
      removeRoute: (routeId: string) => dispatch({ type: 'removeRoute', routeId }),
    }),
    [],
  );

  const value = useMemo<JournalContextValue>(
    () => ({ data, ready, ...actions }),
    [data, ready, actions],
  );

  return <JournalContext.Provider value={value}>{children}</JournalContext.Provider>;
}

/** Bandera booleana que solo puede pasar de false a true. */
function useReducerFlag(): [boolean, () => void] {
  const [flag, set] = useReducer(() => true, false);
  return [flag, set];
}

export function useJournal(): JournalContextValue {
  const context = useContext(JournalContext);
  if (!context) throw new Error('useJournal debe usarse dentro de JournalProvider');
  return context;
}
