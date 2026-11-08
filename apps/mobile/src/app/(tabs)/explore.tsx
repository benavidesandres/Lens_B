import Feather from '@expo/vector-icons/Feather';
import type { Category, Place } from '@lens/shared';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import type MapView from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNearbyPlaces } from '@/api/queries';
import { Chip } from '@/components/ui/chip';
import { IconButton } from '@/components/ui/icon-button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { LocationGate } from '@/features/location/location-gate';
import { useLocation } from '@/features/location/location-provider';
import { CATEGORY_ICONS, CATEGORY_ORDER, categoryLabel } from '@/features/places/category-meta';
import { LensMap } from '@/features/places/lens-map';
import { PlaceImage } from '@/features/places/place-image';
import { PlaceMarker } from '@/features/places/place-marker';
import { PlaceMeta } from '@/features/places/place-meta';
import { useTheme } from '@/theme/use-theme';

const CARD_HEIGHT = 116;
const CARD_GAP = 10;
// Lo que asoma de la tarjeta siguiente: indica que se puede deslizar.
const CARD_SIDE_INSET = 28;
const CAROUSEL_BOTTOM_GAP = 12;
// En iOS la barra de pestañas flota sobre el contenido; en Android lo empuja.
const IOS_TAB_BAR_HEIGHT = 60;

export default function ExploreScreen() {
  const { colors } = useTheme();
  const { coords } = useLocation();

  // Con mapa la pantalla ocupa todo el alto; sin él, los mensajes respetan la barra de estado.
  return (
    <SafeAreaView
      edges={coords ? [] : ['top']}
      style={[styles.flex, { backgroundColor: colors.background }]}>
      <LocationGate
        loading={
          <View style={[styles.flex, styles.center]}>
            <ActivityIndicator color={colors.accent} />
          </View>
        }>
        <ExploreMap />
      </LocationGate>
    </SafeAreaView>
  );
}

function ExploreMap() {
  const { colors, spacing, radius } = useTheme();
  const { coords } = useLocation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const listRef = useRef<FlatList<Place>>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // El centro inicial se fija una vez; luego el usuario controla el mapa.
  const [initialCenter] = useState(coords!);

  // Mismo radio que Inicio: comparten datos y no se gasta cuota de Google dos veces.
  const nearby = useNearbyPlaces(coords);
  const places = useMemo(
    () => (nearby.data ?? []).filter((place) => !category || place.category === category),
    [nearby.data, category],
  );
  // Siempre hay una tarjeta activa para que el mapa y el carrusel coincidan.
  const activeId = places.some((place) => place.id === selectedId)
    ? selectedId
    : (places[0]?.id ?? null);

  const cardWidth = width - CARD_SIDE_INSET * 2;
  const interval = cardWidth + CARD_GAP;
  const bottomOffset =
    (Platform.OS === 'ios' ? insets.bottom + IOS_TAB_BAR_HEIGHT : 0) + CAROUSEL_BOTTOM_GAP;
  const hasCards = places.length > 0;
  const mapPadding = bottomOffset + (hasCards ? CARD_HEIGHT : 0);

  const focusOn = (place: Place) => {
    mapRef.current?.animateCamera(
      { center: { latitude: place.lat, longitude: place.lon } },
      { duration: 350 },
    );
  };

  const selectFromMap = (place: Place) => {
    setSelectedId(place.id);
    focusOn(place);
    const index = places.findIndex((item) => item.id === place.id);
    if (index >= 0) listRef.current?.scrollToOffset({ offset: index * interval, animated: true });
  };

  const selectFromCarousel = (offset: number) => {
    const place = places[Math.round(offset / interval)];
    if (!place || place.id === activeId) return;
    setSelectedId(place.id);
    focusOn(place);
  };

  const changeCategory = (next: Category | null) => {
    setSelectedId(null);
    setCategory(next);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const recenter = () => {
    if (!coords) return;
    mapRef.current?.animateToRegion(
      { latitude: coords.lat, longitude: coords.lon, latitudeDelta: 0.012, longitudeDelta: 0.012 },
      350,
    );
  };

  const status = nearby.isFetching
    ? { icon: null, text: 'Buscando lugares…' }
    : nearby.isError && !nearby.data
      ? { icon: 'wifi-off' as const, text: 'Sin conexión. Toca para reintentar' }
      : !hasCards
        ? { icon: 'compass' as const, text: 'Sin lugares de este tipo por aquí' }
        : null;

  return (
    <View style={styles.flex}>
      <LensMap ref={mapRef} center={initialCenter} bottomPadding={mapPadding}>
        {places.map((place) => (
          <PlaceMarker
            key={place.id}
            place={place}
            selected={activeId === place.id}
            onPress={selectFromMap}
          />
        ))}
      </LensMap>

      <SafeAreaView edges={['top']} style={styles.topOverlay} pointerEvents="box-none">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            gap: spacing.sm,
          }}>
          <Chip
            floating
            label="Todo"
            icon="compass"
            selected={category === null}
            onPress={() => changeCategory(null)}
          />
          {CATEGORY_ORDER.map((item) => (
            <Chip
              key={item}
              floating
              label={categoryLabel(item)}
              icon={CATEGORY_ICONS[item]}
              selected={category === item}
              onPress={() => changeCategory(item)}
            />
          ))}
        </ScrollView>

        {status ? (
          <PressableScale
            accessibilityRole={status.icon === 'wifi-off' ? 'button' : 'text'}
            disabled={status.icon !== 'wifi-off'}
            onPress={() => void nearby.refetch()}
            style={[
              styles.status,
              {
                backgroundColor: colors.surface,
                borderRadius: radius.pill,
                boxShadow: colors.shadow,
              },
            ]}>
            {status.icon ? (
              <Feather name={status.icon} size={14} color={colors.textSecondary} />
            ) : (
              <ActivityIndicator size="small" color={colors.accent} />
            )}
            <Text variant="smallStrong" tone="secondary">
              {status.text}
            </Text>
          </PressableScale>
        ) : null}
      </SafeAreaView>

      <View style={[styles.bottomOverlay, { bottom: bottomOffset }]} pointerEvents="box-none">
        <IconButton
          icon="crosshair"
          label="Centrar en mi ubicación"
          onPress={recenter}
          size={48}
          style={{ alignSelf: 'flex-end', marginRight: spacing.lg, marginBottom: spacing.md }}
        />

        {hasCards ? (
          <FlatList
            ref={listRef}
            data={places}
            horizontal
            keyExtractor={(place) => place.id}
            showsHorizontalScrollIndicator={false}
            snapToInterval={interval}
            decelerationRate="fast"
            disableIntervalMomentum
            contentContainerStyle={{ paddingHorizontal: CARD_SIDE_INSET, gap: CARD_GAP }}
            getItemLayout={(_, index) => ({
              length: interval,
              offset: CARD_SIDE_INSET + interval * index,
              index,
            })}
            onMomentumScrollEnd={(event) => selectFromCarousel(event.nativeEvent.contentOffset.x)}
            renderItem={({ item }) => <ExploreCard place={item} width={cardWidth} />}
            // La sombra de las tarjetas no debe recortarse contra el borde de la lista.
            style={styles.carousel}
          />
        ) : null}
      </View>
    </View>
  );
}

function ExploreCard({ place, width }: { place: Place; width: number }) {
  const { colors, spacing, radius } = useTheme();

  return (
    <PressableScale
      accessibilityRole="link"
      accessibilityLabel={`Ver ficha de ${place.name}`}
      pressedScale={0.98}
      onPress={() => router.push({ pathname: '/place/[id]', params: { id: place.id } })}
      style={[
        styles.card,
        {
          width,
          padding: spacing.sm,
          gap: spacing.md,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          boxShadow: colors.shadow,
        },
      ]}>
      <PlaceImage
        uri={place.imageUrl}
        category={place.category}
        style={[styles.cardImage, { borderRadius: radius.md }]}
      />
      <View style={styles.flex}>
        <Text variant="label" numberOfLines={1} style={{ color: colors.category[place.category] }}>
          {place.kind ?? categoryLabel(place.category)}
        </Text>
        <Text variant="heading" numberOfLines={2} style={{ marginVertical: spacing.xxs }}>
          {place.name}
        </Text>
        <PlaceMeta place={place} />
      </View>
      <Feather name="chevron-right" size={18} color={colors.textTertiary} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  status: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    minHeight: 36,
  },
  bottomOverlay: { position: 'absolute', left: 0, right: 0 },
  carousel: { flexGrow: 0, overflow: 'visible' },
  card: {
    height: CARD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
  },
  cardImage: { width: 100, height: 100 },
});
