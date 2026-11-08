import Feather from '@expo/vector-icons/Feather';
import { distanceMeters, type RoutePlan, type RouteStop } from '@lens/shared';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRoutePlan } from '@/api/queries';
import { Button } from '@/components/ui/button';
import { FloatingHeader } from '@/components/ui/floating-header';
import { IconButton } from '@/components/ui/icon-button';
import { StateMessage } from '@/components/ui/state-message';
import { Text } from '@/components/ui/text';
import { useJournal } from '@/features/journal/journal-provider';
import { useLocation } from '@/features/location/location-provider';
import { LensMap } from '@/features/places/lens-map';
import { PlaceMarker } from '@/features/places/place-marker';
import { PlaceRow } from '@/features/places/place-row';
import { RoutePath } from '@/features/routes/route-path';
import { openWalkingDirections } from '@/lib/directions';
import { formatDistance, formatMinutes } from '@/lib/format';
import { useTheme } from '@/theme/use-theme';

// Distancia a la que una parada se marca como visitada automáticamente.
const VISIT_RADIUS_METERS = 40;
const MAP_HEIGHT_RATIO = 0.36;
const STOP_BADGE_SIZE = 32;

const success = () => {
  if (Platform.OS !== 'web') {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
};

export default function RouteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { data: journal } = useJournal();
  const saved = journal.routes.find((route) => route.plan.id === id);
  const { data: plan } = useRoutePlan(id, saved?.plan);

  if (!plan) {
    return (
      <SafeAreaView style={[styles.flex, styles.center, { backgroundColor: colors.background }]}>
        <FloatingHeader />
        <StateMessage
          icon="map"
          title="Ruta no disponible"
          description="Esta ruta ya no está en memoria. Puedes crear una nueva en un momento."
          actionLabel="Crear una ruta"
          onAction={() => router.replace('/routes')}
        />
      </SafeAreaView>
    );
  }

  return <RouteDetail plan={plan} visitedStopIds={saved?.visitedStopIds ?? []} isSaved={!!saved} />;
}

function RouteDetail({
  plan,
  visitedStopIds,
  isSaved,
}: {
  plan: RoutePlan;
  visitedStopIds: string[];
  isSaved: boolean;
}) {
  const { colors, spacing, radius } = useTheme();
  const { height } = useWindowDimensions();
  const { coords } = useLocation();
  const { saveRoute, recordVisit, removeRoute } = useJournal();

  // Marca como visitada la parada junto a la que se encuentra el usuario (solo rutas guardadas).
  useEffect(() => {
    if (!coords || !isSaved) return;
    for (const stop of plan.stops) {
      if (
        !visitedStopIds.includes(stop.place.id) &&
        distanceMeters(coords, stop.place) <= VISIT_RADIUS_METERS
      ) {
        recordVisit(stop.place, plan.id);
      }
    }
  }, [coords, isSaved, plan, visitedStopIds, recordVisit]);

  // Con Google Routes se dibuja el camino real por calles; si no, se unen las
  // paradas en línea recta desde la posición actual del usuario.
  const hasStreetPath = plan.path.length > 1;
  const path = useMemo(() => {
    if (plan.path.length > 1) {
      return plan.path.map((point) => ({ latitude: point.lat, longitude: point.lon }));
    }
    const points = plan.stops.map((stop) => ({
      latitude: stop.place.lat,
      longitude: stop.place.lon,
    }));
    return coords ? [{ latitude: coords.lat, longitude: coords.lon }, ...points] : points;
  }, [plan.path, plan.stops, coords]);

  const center = useMemo(() => {
    const lats = plan.stops.map((stop) => stop.place.lat);
    const lons = plan.stops.map((stop) => stop.place.lon);
    return {
      lat: (Math.min(...lats) + Math.max(...lats)) / 2,
      lon: (Math.min(...lons) + Math.max(...lons)) / 2,
      span: Math.max(
        0.006,
        (Math.max(...lats) - Math.min(...lats)) * 1.8,
        (Math.max(...lons) - Math.min(...lons)) * 1.8,
      ),
    };
  }, [plan.stops]);

  const hasStops = plan.stops.length > 0;
  const nextStop = isSaved
    ? plan.stops.find((stop) => !visitedStopIds.includes(stop.place.id))
    : undefined;
  const completed = isSaved && hasStops && nextStop === undefined;
  const progress = hasStops ? Math.min(1, visitedStopIds.length / plan.stops.length) : 0;

  const confirmRemove = () => {
    Alert.alert('¿Eliminar esta ruta?', 'Se borrará de tus rutas guardadas.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          router.back();
          removeRoute(plan.id);
        },
      },
    ]);
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <FloatingHeader
        right={
          isSaved ? (
            <IconButton icon="trash-2" label="Eliminar ruta" onPress={confirmRemove} />
          ) : undefined
        }
      />

      {hasStops ? (
        <View style={{ height: height * MAP_HEIGHT_RATIO }}>
          <LensMap center={center} span={center.span}>
            <RoutePath coordinates={path} dashed={!hasStreetPath} />
            {plan.stops.map((stop, index) => (
              <PlaceMarker
                key={stop.place.id}
                place={stop.place}
                order={index + 1}
                visited={visitedStopIds.includes(stop.place.id)}
              />
            ))}
          </LensMap>
        </View>
      ) : (
        <SafeAreaView edges={['top']} style={styles.headerSpacer} />
      )}

      <ScrollView
        style={styles.flex}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.gutter,
          paddingTop: spacing.xl,
          paddingBottom: spacing.xl,
        }}>
        <Text variant="label" tone="accent">
          {plan.isFree ? 'Ruta gratuita' : 'Tu ruta a pie'}
        </Text>
        <Text variant="title" style={{ marginTop: spacing.xs }} accessibilityRole="header">
          {plan.title}
        </Text>
        <Text tone="secondary" style={{ marginTop: spacing.sm }}>
          {plan.summary}
        </Text>

        <View
          style={[
            styles.stats,
            {
              marginTop: spacing.lg,
              paddingVertical: spacing.md,
              borderRadius: radius.md,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            },
          ]}>
          <Stat icon="clock" label="Duración" value={formatMinutes(plan.totalMinutes)} />
          <Stat icon="navigation" label="Distancia" value={formatDistance(plan.totalMeters)} />
          <Stat
            icon="map-pin"
            label="Paradas"
            value={
              isSaved ? `${visitedStopIds.length}/${plan.stops.length}` : String(plan.stops.length)
            }
          />
        </View>

        {isSaved && hasStops ? (
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: plan.stops.length, now: visitedStopIds.length }}
            style={[styles.track, { marginTop: spacing.md, backgroundColor: colors.surfaceMuted }]}>
            <View
              style={[
                styles.fill,
                {
                  width: `${progress * 100}%`,
                  backgroundColor: completed ? colors.success : colors.accent,
                },
              ]}
            />
          </View>
        ) : null}

        {completed ? (
          <View
            style={[
              styles.banner,
              {
                marginTop: spacing.lg,
                padding: spacing.lg,
                gap: spacing.md,
                borderRadius: radius.md,
                backgroundColor: colors.successMuted,
              },
            ]}>
            <Feather name="award" size={24} color={colors.success} />
            <View style={styles.flex}>
              <Text variant="bodyStrong">¡Ruta completada!</Text>
              <Text variant="small" tone="secondary">
                Tus paradas ya están en el diario.
              </Text>
            </View>
          </View>
        ) : null}

        <View style={{ marginTop: spacing.xl }}>
          <Text variant="title" style={styles.sectionTitle} accessibilityRole="header">
            Recorrido
          </Text>
          {hasStops ? (
            plan.stops.map((stop, index) => (
              <StopItem
                key={stop.place.id}
                stop={stop}
                index={index}
                isLast={index === plan.stops.length - 1}
                visited={visitedStopIds.includes(stop.place.id)}
                isNext={nextStop?.place.id === stop.place.id}
              />
            ))
          ) : (
            <StateMessage
              icon="compass"
              title="Sin paradas"
              description="No encontramos lugares adecuados cerca. Prueba con otros gustos o más tiempo."
              actionLabel="Cambiar mi ruta"
              onAction={() => router.back()}
            />
          )}
        </View>
      </ScrollView>

      {hasStops ? (
        <SafeAreaView
          edges={['bottom']}
          style={{
            paddingHorizontal: spacing.gutter,
            paddingTop: spacing.md,
            paddingBottom: spacing.sm,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
          }}>
          {!isSaved ? (
            <Button
              label="Guardar y empezar"
              icon="play"
              accessibilityHint="Guarda la ruta en tu diario y registra las paradas que visites"
              onPress={() => {
                saveRoute(plan);
                success();
              }}
            />
          ) : nextStop ? (
            <View style={[styles.actions, { gap: spacing.sm }]}>
              <Button
                label={`Ir a ${nextStop.place.name}`}
                icon="navigation"
                onPress={() => openWalkingDirections(nextStop.place)}
                style={styles.flex}
              />
              <Button
                label="Ya llegué"
                icon="check"
                variant="secondary"
                accessibilityHint="Marca esta parada como visitada"
                onPress={() => {
                  recordVisit(nextStop.place, plan.id);
                  success();
                }}
              />
            </View>
          ) : (
            <Button
              label="Crear otra ruta"
              icon="plus"
              onPress={() => router.navigate('/routes')}
            />
          )}
        </SafeAreaView>
      ) : null}
    </View>
  );
}

function StopItem({
  stop,
  index,
  isLast,
  visited,
  isNext,
}: {
  stop: RouteStop;
  index: number;
  isLast: boolean;
  visited: boolean;
  isNext: boolean;
}) {
  const { colors, spacing } = useTheme();
  const badgeColor = visited ? colors.success : isNext ? colors.accent : colors.surfaceMuted;
  const badgeForeground = visited || isNext ? colors.onAccent : colors.textSecondary;

  return (
    <View style={[styles.stop, { gap: spacing.md }]}>
      <View style={styles.rail}>
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          {visited ? (
            <Feather name="check" size={17} color={badgeForeground} />
          ) : (
            <Text variant="smallStrong" style={{ color: badgeForeground }}>
              {index + 1}
            </Text>
          )}
        </View>
        {!isLast ? <View style={[styles.line, { backgroundColor: colors.border }]} /> : null}
      </View>

      <View style={[styles.flex, { paddingBottom: isLast ? 0 : spacing.lg }]}>
        <Text variant="small" tone="tertiary" style={styles.legText}>
          {isNext ? 'Siguiente · ' : ''}
          {formatMinutes(stop.legMinutes)} a pie · visita de {stop.stayMinutes} min
        </Text>
        <PlaceRow place={stop.place} />
        {stop.note ? <Text tone="secondary">{stop.note}</Text> : null}
      </View>
    </View>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={styles.stat}>
      <Feather name={icon} size={16} color={colors.accent} />
      <Text variant="heading">{value}</Text>
      <Text variant="small" tone="tertiary">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { justifyContent: 'center' },
  headerSpacer: { minHeight: 60 },
  stats: { flexDirection: 'row', borderWidth: 1 },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  banner: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { marginBottom: 12 },
  actions: { flexDirection: 'row' },
  stop: { flexDirection: 'row' },
  rail: { alignItems: 'center', width: STOP_BADGE_SIZE },
  badge: {
    width: STOP_BADGE_SIZE,
    height: STOP_BADGE_SIZE,
    borderRadius: STOP_BADGE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: { flex: 1, width: 2, marginVertical: 4 },
  legText: { marginTop: 6 },
});
