import type { PlaceDetail } from '@lens/shared';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { usePlaceDetail } from '@/api/queries';
import { Button } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';
import { Skeleton } from '@/components/ui/skeleton';
import { StateMessage } from '@/components/ui/state-message';
import { Text } from '@/components/ui/text';
import { useJournal } from '@/features/journal/journal-provider';
import { useLocation } from '@/features/location/location-provider';
import { categoryLabel } from '@/features/places/category-meta';
import { formatDistance, formatMinutes } from '@/lib/format';
import { useTheme } from '@/theme/use-theme';

/** Abre la app de mapas del sistema con indicaciones a pie. */
function openWalkingDirections(place: Pick<PlaceDetail, 'lat' | 'lon' | 'name'>) {
  const destination = `${place.lat},${place.lon}`;
  const url =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?daddr=${destination}&dirflg=w`
      : `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=walking`;
  void Linking.openURL(url);
}

function freeLabel(isFree: boolean | null): string {
  if (isFree === true) return 'Gratuita';
  if (isFree === false) return 'De pago';
  return 'No indicada';
}

export default function PlaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { coords } = useLocation();
  const { data: journal, recordOpen } = useJournal();
  const detail = usePlaceDetail(id, coords);
  const { colors, spacing, radius } = useTheme();

  // Abrir la ficha cuenta como "descubrir" el lugar.
  const place = detail.data;
  useEffect(() => {
    if (place) recordOpen(place);
  }, [place, recordOpen]);

  if (detail.isPending) return <PlaceSkeleton />;
  if (detail.isError || !place) {
    return (
      <StateMessage
        icon="alert-circle"
        title="No pudimos abrir este lugar"
        description={detail.error?.message}
        actionLabel="Reintentar"
        onAction={() => void detail.refetch()}
      />
    );
  }

  const passCount = journal.places[place.id]?.passCount ?? 0;
  // Solo se muestran los datos que la fuente proporciona.
  const allFacts: [string, string | null][] = [
    ['Tipo', place.kind ?? categoryLabel(place.category)],
    ['Construido', place.builtIn],
    ['Dirección', place.address],
    ['Horario', place.openingHours],
    ['Entrada', freeLabel(place.isFree)],
    ['Fuente', place.source === 'wikipedia' ? 'Wikipedia' : 'OpenStreetMap'],
  ];
  const facts = allFacts.filter((fact): fact is [string, string] => fact[1] !== null);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
      <Animated.View entering={FadeIn.duration(250)}>
        {place.imageUrl ? (
          <Image
            source={place.imageUrl}
            style={[styles.hero, { backgroundColor: colors.surfaceMuted }]}
            contentFit="cover"
            transition={250}
            accessibilityIgnoresInvertColors
          />
        ) : null}

        <View style={{ padding: spacing.xl }}>
          <Text variant="label" style={{ color: colors.category[place.category] }}>
            {categoryLabel(place.category)}
          </Text>
          <Text variant="display" style={{ marginTop: spacing.xs }} accessibilityRole="header">
            {place.name}
          </Text>
          <Text tone="secondary" style={{ marginTop: spacing.sm }}>
            {place.builtIn ? `Construido en ${place.builtIn} · ` : ''}
            {formatDistance(place.distanceMeters)} · {formatMinutes(place.walkMinutes)} caminando
          </Text>

          {passCount >= 2 ? (
            <View
              style={[
                styles.note,
                {
                  backgroundColor: colors.accentMuted,
                  borderRadius: radius.sm,
                  padding: spacing.md,
                  marginTop: spacing.lg,
                },
              ]}>
              <Text variant="small" tone="accent">
                Has pasado frente a este lugar {passCount} veces.
              </Text>
            </View>
          ) : null}

          <View style={[styles.actions, { gap: spacing.sm, marginTop: spacing.xl }]}>
            <Button
              label="Cómo llegar"
              icon="navigation"
              onPress={() => openWalkingDirections(place)}
              style={styles.flex}
            />
            {place.wikipediaUrl ? (
              <Button
                label="Historia completa"
                icon="book-open"
                variant="secondary"
                onPress={() => void WebBrowser.openBrowserAsync(place.wikipediaUrl!)}
                style={styles.flex}
              />
            ) : null}
          </View>

          {(place.description ?? place.summary) ? (
            <View style={{ marginTop: spacing.xxl, gap: spacing.md }}>
              <Text variant="label">Historia</Text>
              {(place.description ?? place.summary ?? '')
                .split(/\n+/)
                .filter((paragraph) => paragraph.trim().length > 0)
                .map((paragraph, index) => (
                  <Text key={index} style={styles.paragraph}>
                    {paragraph.trim()}
                  </Text>
                ))}
            </View>
          ) : (
            <Text tone="secondary" style={{ marginTop: spacing.xxl }}>
              Aún no hay una historia documentada para este lugar. Si pasas por allí, fíjate en los
              detalles: a veces lo interesante no está escrito en ninguna parte.
            </Text>
          )}

          <View style={{ marginTop: spacing.xxl }}>
            <Text variant="label" style={{ marginBottom: spacing.sm }}>
              Ficha
            </Text>
            {facts.map(([label, value]) => (
              <View key={label}>
                <Divider />
                <View style={[styles.fact, { paddingVertical: spacing.md, gap: spacing.lg }]}>
                  <Text variant="small" tone="tertiary" style={styles.factLabel}>
                    {label}
                  </Text>
                  <Text variant="small" style={styles.flex}>
                    {value}
                  </Text>
                </View>
              </View>
            ))}
            <Divider />
          </View>

          {place.website ? (
            <Button
              label="Sitio web"
              variant="ghost"
              icon="external-link"
              onPress={() => void WebBrowser.openBrowserAsync(place.website!)}
              style={{ alignSelf: 'flex-start', marginTop: spacing.lg }}
            />
          ) : null}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

function PlaceSkeleton() {
  const { spacing } = useTheme();
  return (
    <View>
      <Skeleton height={260} style={{ borderRadius: 0 }} />
      <View style={{ padding: spacing.xl, gap: spacing.md }}>
        <Skeleton height={12} width="30%" />
        <Skeleton height={32} width="85%" />
        <Skeleton height={14} width="60%" />
        <Skeleton height={120} style={{ marginTop: spacing.xl }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { width: '100%', aspectRatio: 4 / 3 },
  note: {},
  actions: { flexDirection: 'row' },
  paragraph: { lineHeight: 24 },
  fact: { flexDirection: 'row' },
  factLabel: { width: 96 },
});
