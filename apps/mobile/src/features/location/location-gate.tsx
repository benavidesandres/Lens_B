import type { ReactNode } from 'react';

import { StateMessage } from '@/components/ui/state-message';

import { useLocation } from './location-provider';

/**
 * Muestra el contenido solo cuando hay ubicación disponible; si no, explica
 * por qué la necesitamos y ofrece la acción adecuada (pedir permiso o ir a Ajustes).
 */
export function LocationGate({ children, loading }: { children: ReactNode; loading: ReactNode }) {
  const { status, coords, canAskAgain, requestPermission, openSettings } = useLocation();

  if (status === 'denied') {
    return (
      <StateMessage
        icon="map-pin"
        title="Necesitamos tu ubicación"
        description="LENS muestra lo que hay a tu alrededor. Tu ubicación no se guarda ni se comparte."
        actionLabel={canAskAgain ? 'Permitir ubicación' : 'Abrir Ajustes'}
        onAction={canAskAgain ? () => void requestPermission() : openSettings}
      />
    );
  }

  if (status === 'unavailable') {
    return (
      <StateMessage
        icon="navigation"
        title="Ubicación no disponible"
        description="Comprueba que los servicios de ubicación estén activados en tu dispositivo."
        actionLabel="Reintentar"
        onAction={() => void requestPermission()}
      />
    );
  }

  if (!coords) return <>{loading}</>;
  return <>{children}</>;
}
