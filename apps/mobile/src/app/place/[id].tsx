import Feather from '@expo/vector-icons/Feather';
import type { PlaceDetail } from '@lens/shared';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, type ComponentProps } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePlaceDetail } from '@/api/queries';
import { Button } from '@/components/ui/button';
import { FloatingHeader } from '@/components/ui/floating-header';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Skeleton } from '@/components/ui/skeleton';
import { StateMessage } from '@/components/ui/state-message';
import { Text } from '@/components/ui/text';
import { useJournal } from '@/features/journal/journal-provider';
import { useLocation } from '@/features/location/location-provider';
import { categoryLabel } from '@/features/places/category-meta';
import { PlaceImage } from '@/features/places/place-image';
import { openWalkingDirections } from '@/lib/directions';
import {
  formatDistance,
  formatMinutes,
  formatPriceLevel,
  formatPriceRange,
  formatRating,
  priceLevelName,
} from '@/lib/format';
import { useTheme } from '@/theme/use-theme';

type IconName = ComponentProps<typeof Feather>['name'];

const SOURCE_LABELS: Record<PlaceDetail['source'], string> = {
  google: 'Google Maps',
  wikipedia: 'Wikipedia',
  osm: 'OpenStreetMap',
};

/** Precio en texto: "$ · Moderado · $ 20.000 – $ 40.000 por persona". */
function priceLabel(place: PlaceDetail): string | null {
  const parts = [
    place.priceLevel !== null && place.priceLevel > 0
      ? `${formatPriceLevel(place.priceLevel)} · ${priceLevelName(place.priceLevel)}`
      : null,
    place.priceRange ? formatPriceRange(place.priceRange) : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}

function freeLabel(isFree: boolean | null): string | null {
  if (isFree === true) return 'Gratuita';
  if (isFree === false) return 'De pago';
  return null;
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
      <SafeAreaView style={[styles.flex, styles.center]}>
        <FloatingHeader />
        <StateMessage
          icon="alert-circle"
          title="No pudimos abrir este lugar"
          description={detail.error?.message}
          actionLabel="Reintentar"
          onAction={() => void detail.refetch()}
        />
      </SafeAreaView>
    );
  }

  const passCount = journal.places[place.id]?.passCount ?? 0;
  // Solo se muestran los datos que la fuente proporciona.
  const allFacts: [IconName, string, string | null][] = [
    ['clock', 'Horario', place.openingHours],
    ['map-pin', 'Dirección', place.address],
    [
      'star',
      'Calificación',
      place.rating !== null ? formatRating(place.rating, place.ratingCount) : null,
    ],
    ['credit-card', 'Precio', priceLabel(place)],
    // En gastronomía "Entrada" no aplica: el precio ya lo indica.
    ['tag', 'Entrada', place.category === 'food' ? null : freeLabel(place.isFree)],
    ['calendar', 'Construido', place.builtIn],
    ['phone', 'Teléfono', place.phone],
  ];
  const facts = allFacts.filter((fact): fact is [IconName, string, string] => fact[2] !== null);

  const links: { icon: IconName; label: string; onPress: () => void }[] = [
    ...(place.phone
      ? [
          {
            icon: 'phone' as const,
            label: 'Llamar',
            onPress: () => void Linking.openURL(`tel:${place.phone!.replace(/[^\d+]/g, '')}`),
          },
        ]
      : []),
    ...(place.website
      ? [
          {
            icon: 'globe' as const,
            label: 'Sitio web',
            onPress: () => void WebBrowser.openBrowserAsync(place.website!),
          },
        ]
      : []),
    ...(place.mapsUrl
      ? [
          {
            icon: 'message-square' as const,
            label: 'Reseñas',
            onPress: () => void Linking.openURL(place.mapsUrl!),
          },
        ]
      : []),
    ...(place.wikipediaUrl
      ? [
          {
            icon: 'book-open' as const,
            label: 'Wikipedia',
            onPress: () => void WebBrowser.openBrowserAsync(place.wikipediaUrl!),
          },
        ]
      : []),
  ];

  const story = (place.description ?? place.summary ?? '')
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <FloatingHeader />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <Animated.View entering={FadeIn.duration(250)}>
          <PlaceImage
            uri={place.imageUrl}
            category={place.category}
            iconSize={64}
            style={styles.hero}
          />

          <View
            style={{
              marginTop: -radius.xl,
              paddingHorizontal: spacing.gutter,
              paddingTop: spacing.xl,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              backgroundColor: colors.background,
            }}>
            <Text variant="label" style={{ color: colors.category[place.category] }}>
              {place.kind ?? categoryLabel(place.category)}
            </Text>
            <Text variant="display" style={{ marginTop: spacing.xs }} accessibilityRole="header">
              {place.name}
            </Text>

            <View style={[styles.wrap, { gap: spacing.sm, marginTop: spacing.md }]}>
              <Pill
                icon="navigation"
                text={`${formatMinutes(place.walkMinutes)} · ${formatDistance(place.distanceMeters)}`}
              />
              {place.openNow !== null ? (
                <Pill
                  icon="clock"
                  text={place.openNow ? 'Abierto ahora' : 'Cerrado ahora'}
                  color={place.openNow ? colors.success : colors.danger}
                  background={place.openNow ? colors.successMuted : colors.dangerMuted}
                />
              ) : null}
              {place.isFree && place.category !== 'food' ? (
                <Pill
                  icon="tag"
                  text="Gratis"
                  color={colors.success}
                  background={colors.successMuted}
                />
              ) : null}
            </View>

            {passCount >= 2 ? (
              <View
                style={[
                  styles.note,
                  {
                    backgroundColor: colors.accentMuted,
                    borderRadius: radius.md,
                    padding: spacing.md,
                    gap: spacing.sm,
                    marginTop: spacing.lg,
                  },
                ]}>
                <Feather name="repeat" size={15} color={colors.accent} />
                <Text variant="smallStrong" tone="accent" style={styles.flex}>
                  Has pasado frente a este lugar {passCount} veces.
                </Text>
              </View>
            ) : null}

            {links.length > 0 ? (
              <View style={[styles.links, { gap: spacing.sm, marginTop: spacing.xl }]}>
                {links.map((link) => (
                  <LinkTile key={link.label} {...link} />
                ))}
              </View>
            ) : null}

            <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
              <Text variant="title" accessibilityRole="header">
                Su historia
              </Text>
              {story.length > 0 ? (
                story.map((paragraph, index) => (
                  <Text key={index} style={styles.paragraph}>
                    {paragraph}
                  </Text>
                ))
              ) : (
                <Text tone="secondary" style={styles.paragraph}>
                  Aún no hay una historia documentada para este lugar. Si pasas por allí, fíjate en
                  los detalles: a veces lo interesante no está escrito en ninguna parte.
                </Text>
              )}
            </View>

            {facts.length > 0 ? (
              <View style={{ marginTop: spacing.xl, gap: spacing.xs }}>
                <Text variant="title" accessibilityRole="header">
                  Información útil
                </Text>
                {facts.map(([icon, label, value]) => (
                  <View
                    key={label}
                    accessible
                    accessibilityLabel={`${label}: ${value}`}
                    style={[styles.fact, { paddingVertical: spacing.sm + 2, gap: spacing.md }]}>
                    <Feather name={icon} size={17} color={colors.accent} style={styles.factIcon} />
                    <View style={styles.flex}>
                      <Text variant="small" tone="tertiary">
                        {label}
                      </Text>
                      <Text>{value}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            <Text variant="small" tone="tertiary" style={{ marginTop: spacing.lg }}>
              Datos de {SOURCE_LABELS[place.source]}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

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
        <Button
          label={`Cómo llegar · ${formatMinutes(place.walkMinutes)} a pie`}
          icon="navigation"
          onPress={() => openWalkingDirections(place)}
        />
      </SafeAreaView>
    </View>
  );
}

function Pill({
  icon,
  text,
  color,
  background,
}: {
  icon: IconName;
  text: string;
  color?: string;
  background?: string;
}) {
  const { colors, spacing, radius } = useTheme();
  const foreground = color ?? colors.textSecondary;
  return (
    <View
      style={[
        styles.pill,
        {
          gap: spacing.xs + 2,
          paddingHorizontal: spacing.md,
          borderRadius: radius.pill,
          backgroundColor: background ?? colors.surfaceMuted,
        },
      ]}>
      <Feather name={icon} size={13} color={foreground} />
      <Text variant="smallStrong" style={{ color: foreground }}>
        {text}
      </Text>
    </View>
  );
}

function LinkTile({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const { colors, spacing, radius } = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.tile,
        {
          gap: spacing.xs,
          paddingVertical: spacing.md,
          borderRadius: radius.md,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
      ]}>
      <Feather name={icon} size={20} color={colors.accent} />
      <Text variant="small" numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

function PlaceSkeleton() {
  const { spacing } = useTheme();
  return (
    <View>
      <FloatingHeader />
      <Skeleton height={340} style={{ borderRadius: 0 }} />
      <View style={{ padding: spacing.gutter, gap: spacing.md }}>
        <Skeleton height={14} width="30%" />
        <Skeleton height={36} width="85%" />
        <Skeleton height={32} width="55%" />
        <Skeleton height={140} style={{ marginTop: spacing.lg }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { justifyContent: 'center' },
  hero: { width: '100%', height: 340 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  note: { flexDirection: 'row', alignItems: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  links: { flexDirection: 'row' },
  tile: { flex: 1, alignItems: 'center', borderWidth: 1 },
  paragraph: { lineHeight: 26 },
  fact: { flexDirection: 'row', alignItems: 'flex-start' },
  factIcon: { marginTop: 3, width: 20 },
});
