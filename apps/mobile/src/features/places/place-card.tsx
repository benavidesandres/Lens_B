import type { Place } from '@lens/shared';
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { formatDistance, formatMinutes } from '@/lib/format';
import { useTheme } from '@/theme/use-theme';

import { categoryLabel } from './category-meta';
import { PlaceImage } from './place-image';

const CARD_WIDTH = 176;

/** Tarjeta vertical para los carruseles horizontales. */
export function PlaceCard({ place }: { place: Place }) {
  const { colors, spacing, radius } = useTheme();
  const kind = place.kind ?? categoryLabel(place.category);

  return (
    <Link href={{ pathname: '/place/[id]', params: { id: place.id } }} asChild>
      <PressableScale
        accessibilityRole="link"
        accessibilityLabel={`${place.name}, ${kind}, a ${formatMinutes(place.walkMinutes)} caminando`}
        style={{ width: CARD_WIDTH }}>
        <PlaceImage
          uri={place.imageUrl}
          category={place.category}
          iconSize={32}
          style={[styles.image, { borderRadius: radius.lg }]}
        />
        <View style={{ marginTop: spacing.sm, gap: spacing.xxs }}>
          <Text
            variant="label"
            numberOfLines={1}
            style={{ color: colors.category[place.category] }}>
            {kind}
          </Text>
          <Text variant="heading" numberOfLines={2}>
            {place.name}
          </Text>
          <Text variant="small" tone="secondary">
            {formatMinutes(place.walkMinutes)} · {formatDistance(place.distanceMeters)}
          </Text>
        </View>
      </PressableScale>
    </Link>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: 132 },
});
