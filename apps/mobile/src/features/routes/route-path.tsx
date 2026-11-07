import { Polyline, type LatLng } from 'react-native-maps';

import { useTheme } from '@/theme/use-theme';

/** Trazado discontinuo de la ruta sobre el mapa. */
export function RoutePath({ coordinates }: { coordinates: LatLng[] }) {
  const { colors } = useTheme();
  return (
    <Polyline
      coordinates={coordinates}
      strokeColor={colors.accent}
      strokeWidth={3}
      lineDashPattern={[6, 6]}
    />
  );
}
