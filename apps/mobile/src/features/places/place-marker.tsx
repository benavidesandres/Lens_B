import Feather from '@expo/vector-icons/Feather';
import type { Place } from '@lens/shared';
import { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/theme/use-theme';

import { CATEGORY_ICONS } from './category-meta';

// Android necesita unos instantes para dibujar el icono dentro del marcador nativo.
const MARKER_DRAW_MS = 500;

export interface PlaceMarkerProps {
  place: Place;
  selected?: boolean;
  // Número de parada en una ruta; si existe se dibuja en lugar del icono.
  order?: number;
  visited?: boolean;
  onPress?: (place: Place) => void;
}

/** Marcador con el icono de la categoría, o el número de parada en las rutas. */
export const PlaceMarker = memo(function PlaceMarker({
  place,
  selected = false,
  order,
  visited = false,
  onPress,
}: PlaceMarkerProps) {
  const { colors, scheme } = useTheme();

  // Solo se sigue redibujando cuando cambia su aspecto: mantenerlo activo penaliza el mapa.
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  useEffect(() => {
    setTracksViewChanges(true);
    const timer = setTimeout(() => setTracksViewChanges(false), MARKER_DRAW_MS);
    return () => clearTimeout(timer);
  }, [selected, visited, order, scheme]);

  const size = selected ? 46 : 34;
  const background =
    order !== undefined
      ? visited
        ? colors.success
        : colors.accent
      : colors.category[place.category];

  return (
    <Marker
      identifier={place.id}
      coordinate={{ latitude: place.lat, longitude: place.lon }}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={selected ? 10 : 1}
      onPress={(event) => {
        event.stopPropagation();
        onPress?.(place);
      }}
      tracksViewChanges={tracksViewChanges}
      accessibilityLabel={place.name}>
      {/* El margen evita que Android recorte el borde al convertir la vista en imagen. */}
      <View style={styles.frame}>
        <View
          style={[
            styles.pin,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: background,
              borderColor: selected ? colors.text : '#FFFFFF',
            },
          ]}>
          {order !== undefined && !visited ? (
            <Text variant="smallStrong" style={styles.number}>
              {order}
            </Text>
          ) : (
            <Feather
              name={visited ? 'check' : CATEGORY_ICONS[place.category]}
              size={selected ? 21 : 16}
              color="#FFFFFF"
            />
          )}
        </View>
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  frame: { padding: 3, alignItems: 'center', justifyContent: 'center' },
  pin: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: { color: '#FFFFFF' },
});
