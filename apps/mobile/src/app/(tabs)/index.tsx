import Feather from '@expo/vector-icons/Feather';
import type { Category, Place } from '@lens/shared';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useNearbyPlaces } from '@/api/queries';
import { Chip } from '@/components/ui/chip';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { StateMessage } from '@/components/ui/state-message';
import { Text } from '@/components/ui/text';
import { useJournal } from '@/features/journal/journal-provider';
import { LocationGate } from '@/features/location/location-gate';
import { useLocation } from '@/features/location/location-provider';
import { CATEGORY_ICONS, CATEGORY_ORDER, categoryLabel } from '@/features/places/category-meta';
import { FeaturedPlace } from '@/features/places/featured-place';
import { PlaceCard } from '@/features/places/place-card';
import { PlaceRow } from '@/features/places/place-row';
import { RecurringNotice } from '@/features/places/recurring-notice';
import { dayPart, greeting, type DayPart } from '@/lib/format';
import { useTheme } from '@/theme/use-theme';

const MAX_LIST_ITEMS = 20;
const CAROUSEL_SIZE = 8;
const CAROUSEL_MIN_ITEMS = 3;

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

  const { featured, closeBy, list } = useMemo(() => {
    const all = nearby.data ?? [];
    const filtered = category ? all.filter((place) => place.category === category) : all;
    const featuredPlace = pickFeatured(filtered, category ? [category] : moment.prefer);
    const rest = filtered.filter((place) => place.id !== featuredPlace?.id);

    // El carrusel solo aparece si hay suficientes fotos para que luzca.
    const candidates = [...rest]
      .filter((place) => place.imageUrl)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, CAROUSEL_SIZE);
    const carousel = candidates.length >= CAROUSEL_MIN_ITEMS ? candidates : [];
    const carouselIds = new Set(carousel.map((place) => place.id));

    return {
      featured: featuredPlace,
      closeBy: carousel,
      list: rest.filter((place) => !carouselIds.has(place.id)).slice(0, MAX_LIST_ITEMS),
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

  const hasResults = featured !== undefined || closeBy.length > 0 || list.length > 0;

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={nearby.isRefetching}
          onRefresh={() => void nearby.refetch()}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }>
      <ScreenHeader eyebrow={greeting()} title="¿Qué quieres descubrir?" />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: spacing.lg, marginHorizontal: -spacing.gutter }}
        contentContainerStyle={{ paddingHorizontal: spacing.gutter, gap: spacing.sm }}>
        <Chip
          label="Todo"
          icon="compass"
          selected={category === null}
          onPress={() => setCategory(null)}
        />
        {CATEGORY_ORDER.map((item) => (
          <Chip
            key={item}
            label={categoryLabel(item)}
            icon={CATEGORY_ICONS[item]}
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
        ) : !hasResults ? (
          <StateMessage
            icon="compass"
            title="Nada por aquí todavía"
            description="No encontramos lugares de este tipo cerca. Prueba otra categoría o muévete un poco."
            actionLabel={category ? 'Ver todas las categorías' : undefined}
            onAction={category ? () => setCategory(null) : undefined}
          />
        ) : (
          <Animated.View entering={FadeIn.duration(300)}>
            {featured ? (
              <View style={{ marginTop: spacing.xl }}>
                <FeaturedPlace place={featured} eyebrow={moment.eyebrow} />
              </View>
            ) : null}

            <RoutePrompt />

            {closeBy.length > 0 ? (
              <View style={{ marginTop: spacing.xxl }}>
                <SectionHeader label="A pocos pasos" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginTop: spacing.xs, marginHorizontal: -spacing.gutter }}
                  contentContainerStyle={{ paddingHorizontal: spacing.gutter, gap: spacing.md }}>
                  {closeBy.map((place) => (
                    <PlaceCard key={place.id} place={place} />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {list.length > 0 ? (
              <View style={{ marginTop: spacing.xxl }}>
                <SectionHeader label="Más lugares" meta={`${list.length}`} />
                {list.map((place) => (
                  <PlaceRow key={place.id} place={place} />
                ))}
              </View>
            ) : null}
          </Animated.View>
        )}
      </LocationGate>
    </Screen>
  );
}

/** Acceso directo al planificador: la función principal debe verse desde el inicio. */
function RoutePrompt() {
  const { colors, spacing, radius } = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Crear una ruta a pie"
      pressedScale={0.98}
      onPress={() => router.navigate('/routes')}
      style={[
        styles.prompt,
        {
          marginTop: spacing.lg,
          padding: spacing.lg,
          gap: spacing.md,
          borderRadius: radius.lg,
          backgroundColor: colors.accentMuted,
        },
      ]}>
      <View style={[styles.promptIcon, { backgroundColor: colors.accent }]}>
        <Feather name="map" size={20} color={colors.onAccent} />
      </View>
      <View style={styles.flex}>
        <Text variant="bodyStrong">¿Tienes un rato libre?</Text>
        <Text variant="small" tone="secondary">
          Te armamos una ruta a pie a tu medida.
        </Text>
      </View>
      <Feather name="arrow-right" size={20} color={colors.accent} />
    </PressableScale>
  );
}

function HomeSkeleton() {
  const { spacing, radius } = useTheme();
  return (
    <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
      <Skeleton height={340} style={{ borderRadius: radius.xl }} />
      <Skeleton height={76} style={{ borderRadius: radius.lg }} />
      <Skeleton height={84} style={{ borderRadius: radius.md }} />
      <Skeleton height={84} style={{ borderRadius: radius.md }} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  prompt: { flexDirection: 'row', alignItems: 'center' },
  promptIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
