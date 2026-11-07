import type { Coordinates } from '@lens/shared';
import { forwardRef, type ReactNode } from 'react';
import { Platform, StyleSheet } from 'react-native';
import MapView from 'react-native-maps';

import { useTheme } from '@/theme/use-theme';

import { darkMapStyle, lightMapStyle } from './map-style';

export interface LensMapProps {
  center: Coordinates;
  // Grado de zoom inicial expresado como delta de latitud.
  span?: number;
  children?: ReactNode;
  onPress?: () => void;
}

/** Mapa base con el estilo sobrio de LENS en iOS y Android. */
export const LensMap = forwardRef<MapView, LensMapProps>(function LensMap(
  { center, span = 0.012, children, onPress },
  ref,
) {
  const { scheme } = useTheme();

  return (
    <MapView
      ref={ref}
      style={StyleSheet.absoluteFill}
      initialRegion={{
        latitude: center.lat,
        longitude: center.lon,
        latitudeDelta: span,
        longitudeDelta: span,
      }}
      showsUserLocation
      showsMyLocationButton={false}
      showsPointsOfInterests={false}
      showsCompass={false}
      toolbarEnabled={false}
      pitchEnabled={false}
      // iOS: estilo atenuado de Apple Maps. Android: estilo personalizado de Google Maps.
      mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
      userInterfaceStyle={scheme}
      customMapStyle={scheme === 'dark' ? darkMapStyle : lightMapStyle}
      onPress={onPress}>
      {children}
    </MapView>
  );
});
