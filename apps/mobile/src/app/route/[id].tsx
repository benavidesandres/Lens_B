import { distanceMeters, type RoutePlan } from '@lens/shared';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useRoutePlan } from '@/api/queries';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/ui/section-header';
import { StateMessage } from '@/components/ui/state-message';
import { Text } from '@/components/ui/text';
import { useJournal } from '@/features/journal/journal-provider';
import { useLocation } from '@/features/location/location-provider';
import { LensMap } from '@/features/places/lens-map';
import { PlaceMarker } from '@/features/places/place-marker';
import { PlaceRow } from '@/features/places/place-row';
import { RoutePath } from '@/features/routes/route-path';
import { formatDistance, formatMinutes } from '@/lib/format';
import { useTheme } from '@/theme/use-theme';

// Distancia a la que una parada se marca como visitada automáticamente.
const VISIT_RADIUS_METERS = 40;

export default function RouteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: journal } = useJournal();
  const saved = journal.routes.find((route) => route.plan.id === id);
  const { data: plan } = useRoutePlan(id, saved?.plan);

  if (!plan) {
    return (
      <StateMessage
        icon="map"
        title="Ruta no disponible"
        description="Esta ruta ya no está en memoria. Crea una nueva desde la pestaña Rutas."
      />
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
  const { colors, spacing } = useTheme();
  const { coords } = useLocation();
  const { saveRoute, recordVisit } = useJournal();

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

  // El trazado empieza en la posición actual del usuario cuando está disponible.
  const path = useMemo(() => {
    const points = plan.stops.map((stop) => ({
      latitude: stop.place.lat,
      longitude: stop.place.lon,
    }));
    return coords ? [{ latitude: coords.lat, longitude: coords.lon }, ...points] : points;
  }, [plan.stops, coords]);

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

  return (
    <>
      <Stack.Screen options={{ title: plan.title }} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
        {plan.stops.length > 0 ? (
          <View style={styles.map}>
            <LensMap center={center} span={center.span}>
              <RoutePath coordinates={path} />
              {plan.stops.map((stop, index) => (
                <PlaceMarker key={stop.place.id} place={stop.place} order={index + 1} />
              ))}
            </LensMap>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.xl }}>
          <Text variant="label" tone="tertiary">
            {plan.engine === 'ai' ? 'Ruta personalizada' : 'Ruta sugerida'}
            {plan.isFree ? ' · Gratuita' : ''}
          </Text>
          <Text variant="title" style={{ marginTop: spacing.xs }}>
            {plan.title}
          </Text>
          <Text tone="secondary" style={{ marginTop: spacing.sm }}>
            {plan.summary}
          </Text>

          <View
            style={[
              styles.stats,
              { marginTop: spacing.xl, borderColor: colors.border, paddingVertical: spacing.md },
            ]}>
            <Stat label="Duración" value={formatMinutes(plan.totalMinutes)} />
            <Stat label="Distancia" value={formatDistance(plan.totalMeters)} />
            <Stat
              label="Paradas"
              value={
                isSaved
                  ? `${visitedStopIds.length}/${plan.stops.length}`
                  : String(plan.stops.length)
              }
            />
          </View>

          {!isSaved && plan.stops.length > 0 ? (
            <Button
              label="Guardar y empezar"
              icon="bookmark"
              onPress={() => saveRoute(plan)}
              accessibilityHint="Guarda la ruta en tu diario y registra las paradas que visites"
              style={{ marginTop: spacing.xl }}
            />
          ) : null}

          <View style={{ marginTop: spacing.xxl }}>
            <SectionHeader label="Recorrido" />
            {plan.stops.length === 0 ? (
              <StateMessage
                icon="compass"
                title="Sin paradas"
                description="No encontramos lugares adecuados cerca. Prueba con otra petición."
              />
            ) : (
              plan.stops.map((stop, index) => (
                <View key={stop.place.id}>
                  <Text variant="small" tone="tertiary" style={{ marginTop: spacing.md }}>
                    {formatMinutes(stop.legMinutes)} a pie · {formatDistance(stop.legMeters)} ·
                    visita de {stop.stayMinutes} min
                    {visitedStopIds.includes(stop.place.id) ? ' · Visitada' : ''}
                  </Text>
                  <PlaceRow place={stop.place} index={index + 1} />
                  {stop.note ? (
                    <Text tone="secondary" style={{ marginTop: spacing.sm, marginLeft: 34 }}>
                      {stop.note}
                    </Text>
                  ) : null}
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="label" tone="tertiary">
        {label}
      </Text>
      <Text variant="heading">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { height: 280 },
  stats: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stat: { flex: 1, gap: 4 },
});
