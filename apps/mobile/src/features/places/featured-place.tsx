import Feather from '@expo/vector-icons/Feather';
import type { Place } from '@lens/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { formatDistance, formatMinutes, formatRatingValue } from '@/lib/format';
import { useTheme } from '@/theme/use-theme';

import { categoryLabel } from './category-meta';
import { PlaceImage } from './place-image';

export interface FeaturedPlaceProps {
  place: Place;
  // Línea superior contextual, p. ej. "Para esta mañana".
  eyebrow: string;
}

/** Portada de la pantalla de inicio: fotografía a sangre con el texto encima. */
export function FeaturedPlace({ place, eyebrow }: FeaturedPlaceProps) {
  const { colors, spacing, radius } = useTheme();
  const kind = place.kind ?? categoryLabel(place.category);

  return (
    <Link href={{ pathname: '/place/[id]', params: { id: place.id } }} asChild>
      <PressableScale
        accessibilityRole="link"
        accessibilityLabel={`${eyebrow}: ${place.name}, ${kind}, a ${formatMinutes(place.walkMinutes)} caminando`}
        pressedScale={0.98}
        style={StyleSheet.flatten([
          styles.card,
          { borderRadius: radius.xl, boxShadow: colors.shadow },
        ])}>
        <PlaceImage
          uri={place.imageUrl}
          category={place.category}
          iconSize={48}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(20, 12, 6, 0)', 'rgba(20, 12, 6, 0.88)']}
          style={styles.scrim}
          pointerEvents="none"
        />

        <View style={[styles.badge, { backgroundColor: colors.surface, margin: spacing.lg }]}>
          <Text variant="label" tone="accent">
            {eyebrow}
          </Text>
        </View>

        <View style={[styles.copy, { padding: spacing.gutter, gap: spacing.xs }]}>
          <Text variant="label" style={{ color: colors.onPhotoMuted }} numberOfLines={1}>
            {kind}
            {place.builtIn ? ` · ${place.builtIn}` : ''}
          </Text>
          <Text variant="title" style={{ color: colors.onPhoto }} numberOfLines={2}>
            {place.name}
          </Text>
          <View style={[styles.facts, { gap: spacing.md, marginTop: spacing.xxs }]}>
            <View style={[styles.fact, { gap: spacing.xs }]}>
              <Feather name="navigation" size={13} color={colors.onPhoto} />
              <Text variant="smallStrong" style={{ color: colors.onPhoto }}>
                {formatMinutes(place.walkMinutes)} · {formatDistance(place.distanceMeters)}
              </Text>
            </View>
            {place.rating !== null ? (
              <View style={[styles.fact, { gap: spacing.xs }]}>
                <Feather name="star" size={13} color={colors.onPhoto} />
                <Text variant="smallStrong" style={{ color: colors.onPhoto }}>
                  {formatRatingValue(place.rating)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </PressableScale>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    aspectRatio: 1,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%' },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  copy: {},
  facts: { flexDirection: 'row', alignItems: 'center' },
  fact: { flexDirection: 'row', alignItems: 'center' },
});
