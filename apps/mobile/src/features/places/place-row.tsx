import Feather from '@expo/vector-icons/Feather';
import type { Place } from '@lens/shared';
import { Link } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { formatDistance } from '@/lib/format';
import { useTheme } from '@/theme/use-theme';

import { categoryLabel } from './category-meta';
import { PlaceImage } from './place-image';
import { PlaceMeta } from './place-meta';

/** Fila de un lugar: miniatura, tipo, nombre y datos prácticos. */
export const PlaceRow = memo(function PlaceRow({ place }: { place: Place }) {
  const { colors, spacing, radius } = useTheme();
  const kind = place.kind ?? categoryLabel(place.category);

  return (
    <Link href={{ pathname: '/place/[id]', params: { id: place.id } }} asChild>
      <PressableScale
        accessibilityRole="link"
        accessibilityLabel={`${place.name}, ${kind}, a ${formatDistance(place.distanceMeters)}`}
        pressedScale={0.985}
        style={StyleSheet.flatten([
          styles.row,
          { paddingVertical: spacing.sm + 2, gap: spacing.md },
        ])}>
        <PlaceImage
          uri={place.imageUrl}
          category={place.category}
          style={[styles.thumb, { borderRadius: radius.md }]}
        />

        <View style={styles.body}>
          <Text
            variant="label"
            numberOfLines={1}
            style={{ color: colors.category[place.category] }}>
            {kind}
            {place.builtIn ? ` · ${place.builtIn}` : ''}
          </Text>
          <Text variant="heading" numberOfLines={2} style={{ marginVertical: spacing.xxs }}>
            {place.name}
          </Text>
          <PlaceMeta place={place} />
        </View>

        <Feather name="chevron-right" size={18} color={colors.textTertiary} />
      </PressableScale>
    </Link>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  body: { flex: 1 },
  thumb: { width: 84, height: 84 },
});
