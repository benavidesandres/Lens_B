import Feather from '@expo/vector-icons/Feather';
import type { Category, Place } from '@lens/shared';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type MapView from 'react-native-maps';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNearbyPlaces } from '@/api/queries';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { LocationGate } from '@/features/location/location-gate';
import { useLocation } from '@/features/location/location-provider';
import { CATEGORY_ORDER, categoryLabel } from '@/features/places/category-meta';
import { LensMap } from '@/features/places/lens-map';
import { PlaceMarker } from '@/features/places/place-marker';
import { formatDistance, formatMinutes } from '@/lib/format';
import { useTheme } from '@/theme/use-theme';

const EXPLORE_RADIUS_METERS = 1500;

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
            <ActivityIndicator color={colors.textTertiary} />
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
  const mapRef = useRef<MapView>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [selected, setSelected] = useState<Place | null>(null);
  // El centro inicial se fija una vez; luego el usuario controla el mapa.
  const [initialCenter] = useState(coords!);

  const nearby = useNearbyPlaces(coords, { radius: EXPLORE_RADIUS_METERS });
  const places = useMemo(
    () => (nearby.data ?? []).filter((place) => !category || place.category === category),
    [nearby.data, category],
  );

  const recenter = () => {
    if (!coords) return;
    mapRef.current?.animateToRegion(
      { latitude: coords.lat, longitude: coords.lon, latitudeDelta: 0.012, longitudeDelta: 0.012 },
      350,
    );
  };

  return (
    <View style={styles.flex}>
      <LensMap ref={mapRef} center={initialCenter} onPress={() => setSelected(null)}>
        {places.map((place) => (
          <PlaceMarker
            key={place.id}
            place={place}
            selected={selected?.id === place.id}
            onPress={setSelected}
          />
        ))}
      </LensMap>

      <SafeAreaView edges={['top']} style={styles.topOverlay} pointerEvents="box-none">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            gap: spacing.sm,
            paddingTop: spacing.sm,
          }}>
          {[null, ...CATEGORY_ORDER].map((item) => (
            <View
              key={item ?? 'all'}
              style={{
                backgroundColor: category === item ? undefined : colors.surface,
                borderRadius: radius.sm,
              }}>
              <Chip
                label={item ? categoryLabel(item) : 'Cerca de mí'}
                selected={category === item}
                onPress={() => {
                  setSelected(null);
                  setCategory(item);
                }}
              />
            </View>
          ))}
        </ScrollView>
        {nearby.isFetching ? (
          <View
            style={[
              styles.status,
              { backgroundColor: colors.surface, borderRadius: radius.sm, marginTop: spacing.sm },
            ]}>
            <ActivityIndicator size="small" color={colors.textTertiary} />
            <Text variant="small" tone="secondary">
              Buscando lugares
            </Text>
          </View>
        ) : null}
      </SafeAreaView>

      <View
        style={[styles.bottomOverlay, { padding: spacing.lg, gap: spacing.md }]}
        pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Centrar en mi ubicación"
          onPress={recenter}
          style={[styles.fab, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="navigation" size={18} color={colors.text} />
        </Pressable>

        {selected ? (
          <Animated.View
            key={selected.id}
            entering={FadeInDown.duration(220)}
            exiting={FadeOutDown.duration(160)}
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.lg,
                padding: spacing.lg,
              },
            ]}>
            <Text variant="label" style={{ color: colors.category[selected.category] }}>
              {selected.kind ?? categoryLabel(selected.category)}
              {selected.builtIn ? ` · ${selected.builtIn}` : ''}
            </Text>
            <Text variant="title" style={{ marginTop: spacing.xs }} numberOfLines={2}>
              {selected.name}
            </Text>
            <Text variant="small" tone="secondary" style={{ marginTop: spacing.xs }}>
              {formatDistance(selected.distanceMeters)} · {formatMinutes(selected.walkMinutes)}{' '}
              caminando
            </Text>
            {selected.summary ? (
              <Text tone="secondary" numberOfLines={3} style={{ marginTop: spacing.sm }}>
                {selected.summary}
              </Text>
            ) : null}
            <Button
              label="Ver ficha"
              onPress={() => router.push({ pathname: '/place/[id]', params: { id: selected.id } })}
              style={{ marginTop: spacing.lg }}
            />
          </Animated.View>
        ) : null}
      </View>
    </View>
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
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bottomOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'flex-end' },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  card: { alignSelf: 'stretch', borderWidth: StyleSheet.hairlineWidth },
});
