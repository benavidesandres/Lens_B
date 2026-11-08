import { Polyline, type LatLng } from 'react-native-maps';

import { useTheme } from '@/theme/use-theme';

/**
 * Trazado de la ruta sobre el mapa: continuo cuando sigue las calles reales,
 * discontinuo cuando solo une las paradas en línea recta.
 */
export function RoutePath({
  coordinates,
  dashed = true,
}: {
  coordinates: LatLng[];
  dashed?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Polyline
      coordinates={coordinates}
      strokeColor={colors.accent}
      strokeWidth={dashed ? 3 : 4}
      lineDashPattern={dashed ? [6, 6] : undefined}
    />
  );
}
