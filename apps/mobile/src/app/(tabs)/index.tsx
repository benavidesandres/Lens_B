import type { Category, Place } from '@lens/shared';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useNearbyPlaces } from '@/api/queries';
import { Chip } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { StateMessage } from '@/components/ui/state-message';
import { Text } from '@/components/ui/text';
import { useJournal } from '@/features/journal/journal-provider';
import { LocationGate } from '@/features/location/location-gate';
import { useLocation } from '@/features/location/location-provider';
import { CATEGORY_ORDER, categoryLabel } from '@/features/places/category-meta';
import { FeaturedPlace } from '@/features/places/featured-place';
import { PlaceRow } from '@/features/places/place-row';
import { RecurringNotice } from '@/features/places/recurring-notice';
import { dayPart, greeting, type DayPart } from '@/lib/format';
import { useTheme } from '@/theme/use-theme';

const MAX_LIST_ITEMS = 20;

// Qué conviene sugerir según el momento del día.
const MOMENT: Record<DayPart, { eyebrow: string; prefer: Category[] }> = {
  morning: { eyebrow: 'Para esta mañana', prefer: ['food', 'nature', 'history'] },
  afternoon: { eyebrow: 'Para esta tarde', prefer: ['history', 'art', 'nature'] },
  evening: { eyebrow: 'Para esta noche', prefer: ['nature', 'art', 'food'] },
  night: { eyebrow: 'Para esta noche', prefer: ['history', 'hidden', 'food'] },
};

/** Elige el lugar destacado: con foto y de la categoría más adecuada para la hora. */
function pickFeatured(places: Place[], prefer: Category[]): Place | undefined {
  const withImage = places.filter((place) => place.imageUrl && place.summary);
  for (const category of prefer) {
    const match = withImage.find((place) => place.category === category);
    if (match) return match;
  }
  return withImage[0];
}

export default function HomeScreen() {
  const { colors, spacing } = useTheme();
  const { coords } = useLocation();
  const { data: journal } = useJournal();
  const [category, setCategory] = useState<Category | null>(null);
  const nearby = useNearbyPlaces(coords);

  const moment = MOMENT[dayPart()];

  const { featured, list } = useMemo(() => {
    const all = nearby.data ?? [];
    const filtered = category ? all.filter((place) => place.category === category) : all;
    const featuredPlace = pickFeatured(filtered, category ? [category] : moment.prefer);
    return {
      featured: featuredPlace,
      list: filtered.filter((place) => place.id !== featuredPlace?.id).slice(0, MAX_LIST_ITEMS),
    };
  }, [nearby.data, category, moment.prefer]);

  // Lugar frecuente que el usuario todavía no ha abierto.
  const recurring = useMemo(
    () =>
      Object.values(journal.places)
        .filter((entry) => entry.passCount >= 2 && entry.openedAt === null)
        .sort((a, b) => b.passCount - a.passCount)[0],
    [journal.places],
  );

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={nearby.isRefetching}
          onRefresh={() => void nearby.refetch()}
          tintColor={colors.textTertiary}
        />
      }>
      <View style={{ paddingTop: spacing.xl, gap: spacing.xs }}>
        <Text variant="label" tone="tertiary">
          {greeting()}
        </Text>
        <Text variant="display" accessibilityRole="header">
          ¿Qué quieres descubrir?
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: spacing.xl, marginHorizontal: -spacing.xl }}
        contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: spacing.sm }}>
        <Chip label="Cerca de ti" selected={category === null} onPress={() => setCategory(null)} />
        {CATEGORY_ORDER.map((item) => (
          <Chip
            key={item}
            label={categoryLabel(item)}
            selected={category === item}
            onPress={() => setCategory(category === item ? null : item)}
          />
        ))}
      </ScrollView>

      <LocationGate loading={<HomeSkeleton />}>
        {recurring && category === null ? (
          <View style={{ marginTop: spacing.xl }}>
            <RecurringNotice entry={recurring} />
          </View>
        ) : null}

        {nearby.isPending ? (
          <HomeSkeleton />
        ) : nearby.isError && !nearby.data ? (
          <StateMessage
            icon="wifi-off"
            title="No pudimos cargar los lugares"
            description={nearby.error.message}
            actionLabel="Reintentar"
            onAction={() => void nearby.refetch()}
          />
        ) : (
          <Animated.View entering={FadeIn.duration(300)}>
            {featured ? (
              <View style={{ marginTop: spacing.xxl }}>
                <FeaturedPlace place={featured} eyebrow={moment.eyebrow} />
              </View>
            ) : null}

            <View style={{ marginTop: spacing.xxl }}>
              <SectionHeader
                label="Descubrimiento"
                meta={list.length > 0 ? `${list.length} lugares` : undefined}
              />
              {list.length === 0 ? (
                <StateMessage
                  icon="compass"
                  title="Nada por aquí todavía"
                  description="No encontramos lugares de este tipo cerca. Prueba otra categoría o muévete un poco."
                />
              ) : (
                list.map((place) => <PlaceRow key={place.id} place={place} />)
              )}
            </View>
          </Animated.View>
        )}
      </LocationGate>
    </Screen>
  );
}

function HomeSkeleton() {
  const { spacing } = useTheme();
  return (
    <View style={[styles.skeleton, { marginTop: spacing.xxl, gap: spacing.md }]}>
      <Skeleton height={240} />
      <Skeleton height={14} width="40%" />
      <Skeleton height={26} width="80%" />
      <Skeleton height={64} style={{ marginTop: spacing.xl }} />
      <Skeleton height={64} />
      <Skeleton height={64} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {},
});
