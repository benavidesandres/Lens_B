import type { Place } from '@lens/shared';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { formatDistance, formatMinutes } from '@/lib/format';
import { useTheme } from '@/theme/use-theme';

import { categoryLabel } from './category-meta';

export interface FeaturedPlaceProps {
  place: Place;
  // Línea superior contextual, p. ej. "Para esta mañana".
  eyebrow: string;
}

/** Tarjeta destacada con fotografía, al estilo de una portada de revista. */
export function FeaturedPlace({ place, eyebrow }: FeaturedPlaceProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <Link href={{ pathname: '/place/[id]', params: { id: place.id } }} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${eyebrow}: ${place.name}`}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
        {place.imageUrl ? (
          <Image
            source={place.imageUrl}
            style={[
              styles.image,
              { borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
            ]}
            contentFit="cover"
            transition={250}
            accessibilityIgnoresInvertColors
          />
        ) : null}
        <View style={{ marginTop: spacing.md }}>
          <Text variant="label" tone="accent">
            {eyebrow}
          </Text>
          <Text variant="title" style={{ marginTop: spacing.xs }}>
            {place.name}
          </Text>
          <Text variant="small" tone="secondary" style={{ marginTop: spacing.xs }}>
            {[
              place.kind ?? categoryLabel(place.category),
              place.builtIn ? `Construido en ${place.builtIn}` : null,
              `${formatDistance(place.distanceMeters)} · ${formatMinutes(place.walkMinutes)}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {place.summary ? (
            <Text tone="secondary" numberOfLines={3} style={{ marginTop: spacing.sm }}>
              {place.summary}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
});
