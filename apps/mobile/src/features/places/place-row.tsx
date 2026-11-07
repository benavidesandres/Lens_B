import Feather from '@expo/vector-icons/Feather';
import type { Place } from '@lens/shared';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { formatDistance, formatMinutes } from '@/lib/format';
import { useTheme } from '@/theme/use-theme';

import { CATEGORY_ICONS, categoryLabel } from './category-meta';

export interface PlaceRowProps {
  place: Place;
  // Número opcional a la izquierda, usado en rutas para indicar el orden.
  index?: number;
}

/** Fila compacta de un lugar: tipo, nombre, distancia y miniatura. */
export const PlaceRow = memo(function PlaceRow({ place, index }: PlaceRowProps) {
  const { colors, spacing, radius } = useTheme();
  const kind = place.kind ?? categoryLabel(place.category);

  return (
    <Link href={{ pathname: '/place/[id]', params: { id: place.id } }} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${place.name}, ${kind}, a ${formatDistance(place.distanceMeters)}`}
        style={({ pressed }) => [
          styles.row,
          {
            paddingVertical: spacing.md,
            gap: spacing.md,
            borderBottomColor: colors.border,
            opacity: pressed ? 0.6 : 1,
          },
        ]}>
        {index !== undefined ? (
          <Text variant="numeric" tone="tertiary" style={styles.index}>
            {String(index).padStart(2, '0')}
          </Text>
        ) : null}

        <View style={styles.body}>
          <View style={[styles.meta, { gap: spacing.xs }]}>
            <Feather
              name={CATEGORY_ICONS[place.category]}
              size={11}
              color={colors.category[place.category]}
            />
            <Text
              variant="label"
              style={{ color: colors.category[place.category] }}
              numberOfLines={1}>
              {kind}
            </Text>
            {place.builtIn ? (
              <Text variant="label" tone="tertiary">
                · {place.builtIn}
              </Text>
            ) : null}
          </View>
          <Text variant="heading" numberOfLines={2} style={{ marginTop: spacing.xxs }}>
            {place.name}
          </Text>
          <Text variant="small" tone="secondary" style={{ marginTop: spacing.xxs }}>
            {formatDistance(place.distanceMeters)} · {formatMinutes(place.walkMinutes)} a pie
            {place.isFree ? ' · Gratis' : ''}
          </Text>
        </View>

        {place.imageUrl ? (
          <Image
            source={place.imageUrl}
            style={[
              styles.thumb,
              { borderRadius: radius.sm, backgroundColor: colors.surfaceMuted },
            ]}
            contentFit="cover"
            transition={200}
            accessibilityIgnoresInvertColors
          />
        ) : null}
      </Pressable>
    </Link>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  index: {
    width: 22,
    alignSelf: 'flex-start',
    paddingTop: 2,
  },
  body: { flex: 1 },
  meta: { flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 64, height: 64 },
});
