import type { Place } from '@lens/shared';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/theme/use-theme';

export interface PlaceMarkerProps {
  place: Place;
  selected?: boolean;
  // Número de parada en una ruta; si existe se dibuja en lugar del punto.
  order?: number;
  onPress?: (place: Place) => void;
}

/** Marcador discreto: un punto con el color de la categoría, o un número en las rutas. */
export const PlaceMarker = memo(function PlaceMarker({
  place,
  selected = false,
  order,
  onPress,
}: PlaceMarkerProps) {
  const { colors } = useTheme();
  const tint = colors.category[place.category];

  return (
    <Marker
      identifier={place.id}
      coordinate={{ latitude: place.lat, longitude: place.lon }}
      onPress={(event) => {
        event.stopPropagation();
        onPress?.(place);
      }}
      // Evita re-renderizar el marcador nativo en cada frame (mejora mucho el rendimiento).
      tracksViewChanges={false}
      accessibilityLabel={place.name}>
      {order !== undefined ? (
        <View
          style={[
            styles.numbered,
            { backgroundColor: colors.text, borderColor: colors.background },
          ]}>
          <Text variant="label" style={{ color: colors.background, letterSpacing: 0 }}>
            {order}
          </Text>
        </View>
      ) : (
        <View
          style={[
            styles.dot,
            {
              backgroundColor: tint,
              borderColor: colors.surface,
              transform: [{ scale: selected ? 1.5 : 1 }],
            },
          ]}
        />
      )}
    </Marker>
  );
});

const styles = StyleSheet.create({
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  numbered: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
