import Feather from '@expo/vector-icons/Feather';
import type { Place } from '@lens/shared';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { formatDistance, formatMinutes, formatPriceLevel, formatRatingValue } from '@/lib/format';
import { useTheme } from '@/theme/use-theme';

/** Línea de datos prácticos de un lugar: tiempo a pie, valoración, precio y si está abierto. */
export function PlaceMeta({ place }: { place: Place }) {
  const { colors, spacing } = useTheme();
  const price =
    place.priceLevel !== null ? formatPriceLevel(place.priceLevel) : place.isFree ? 'Gratis' : null;

  return (
    <View style={[styles.row, { columnGap: spacing.md, rowGap: spacing.xxs }]}>
      <View style={[styles.item, { gap: spacing.xs }]}>
        <Feather name="navigation" size={12} color={colors.textTertiary} />
        <Text variant="small" tone="secondary">
          {formatMinutes(place.walkMinutes)} · {formatDistance(place.distanceMeters)}
        </Text>
      </View>
      {place.rating !== null ? (
        <View style={[styles.item, { gap: spacing.xs }]}>
          <Feather name="star" size={12} color={colors.accent} />
          <Text variant="small" tone="secondary">
            {formatRatingValue(place.rating)}
          </Text>
        </View>
      ) : null}
      {price ? (
        <Text variant="small" tone="secondary">
          {price}
        </Text>
      ) : null}
      {place.openNow !== null ? (
        <Text
          variant="smallStrong"
          style={{ color: place.openNow ? colors.success : colors.danger }}>
          {place.openNow ? 'Abierto' : 'Cerrado'}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  item: { flexDirection: 'row', alignItems: 'center' },
});
