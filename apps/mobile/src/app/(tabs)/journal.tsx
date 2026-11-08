import Feather from '@expo/vector-icons/Feather';
import type { Category } from '@lens/shared';
import { Link, router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { StateMessage } from '@/components/ui/state-message';
import { Text } from '@/components/ui/text';
import { AccountRow } from '@/features/auth/account-row';
import { useJournal } from '@/features/journal/journal-provider';
import { isDiscovered } from '@/features/journal/journal-reducer';
import type { JournalPlace } from '@/features/journal/journal-schema';
import { CATEGORY_ICONS, CATEGORY_ORDER, categoryLabel } from '@/features/places/category-meta';
import { PlaceImage } from '@/features/places/place-image';
import { formatShortDate } from '@/lib/format';
import { useTheme } from '@/theme/use-theme';

// Metas por categoría: dan una sensación de progreso sin convertir la app en un juego.
const CATEGORY_GOAL = 10;
const RECENT_LIMIT = 15;

export default function JournalScreen() {
  const { colors, spacing, radius } = useTheme();
  const { data } = useJournal();

  const stats = useMemo(() => {
    const entries = Object.values(data.places);
    const discovered = entries.filter(isDiscovered);
    const byCategory = Object.fromEntries(
      CATEGORY_ORDER.map((category) => [category, 0]),
    ) as Record<Category, number>;
    for (const entry of discovered) byCategory[entry.category] += 1;

    return {
      discovered: discovered.length,
      visited: entries.filter((entry) => entry.visitedAt !== null).length,
      routes: data.routes.length,
      byCategory,
      recent: discovered
        .sort((a, b) => (b.openedAt ?? b.visitedAt ?? 0) - (a.openedAt ?? a.visitedAt ?? 0))
        .slice(0, RECENT_LIMIT),
    };
  }, [data]);

  return (
    <Screen>
      <AccountRow />
      <ScreenHeader eyebrow="Tu diario" title="Lo que has descubierto" />

      <View style={[styles.row, { marginTop: spacing.lg, gap: spacing.sm }]}>
        <StatTile icon="eye" value={stats.discovered} label="Hallazgos" />
        <StatTile icon="map-pin" value={stats.visited} label="Visitados" />
        <StatTile icon="map" value={stats.routes} label="Rutas" />
      </View>

      <View style={{ marginTop: spacing.xxl }}>
        <SectionHeader label="Tu progreso" />
        <View
          style={{
            marginTop: spacing.xs,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            borderRadius: radius.lg,
            borderWidth: 1,
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }}>
          {CATEGORY_ORDER.map((category) => {
            const count = stats.byCategory[category];
            const progress = Math.min(1, count / CATEGORY_GOAL);
            return (
              <View
                key={category}
                accessible
                accessibilityLabel={`${categoryLabel(category)}: ${count} de ${CATEGORY_GOAL}`}
                style={{ paddingVertical: spacing.sm + 2, gap: spacing.sm }}>
                <View style={styles.spread}>
                  <View style={[styles.row, styles.centered, { gap: spacing.sm }]}>
                    <Feather
                      name={CATEGORY_ICONS[category]}
                      size={16}
                      color={colors.category[category]}
                    />
                    <Text variant="smallStrong">{categoryLabel(category)}</Text>
                  </View>
                  <Text variant="numeric" tone="tertiary">
                    {count}/{CATEGORY_GOAL}
                  </Text>
                </View>
                <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${progress * 100}%`, backgroundColor: colors.category[category] },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ marginTop: spacing.xxl }}>
        <SectionHeader label="Recientes" />
        {stats.recent.length === 0 ? (
          <StateMessage
            icon="book-open"
            title="Tu diario está vacío"
            description="Abre la ficha de un lugar o completa una ruta y aparecerá aquí."
            actionLabel="Explorar lugares"
            onAction={() => router.navigate('/explore')}
          />
        ) : (
          stats.recent.map((entry) => <RecentEntry key={entry.placeId} entry={entry} />)
        )}
      </View>
    </Screen>
  );
}

function StatTile({
  icon,
  value,
  label,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  value: number;
  label: string;
}) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${value} ${label}`}
      style={[
        styles.flex,
        {
          padding: spacing.md,
          borderRadius: radius.md,
          borderWidth: 1,
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}>
      <Feather name={icon} size={16} color={colors.accent} />
      <Text variant="title" style={{ marginTop: spacing.xs }}>
        {value}
      </Text>
      <Text variant="small" tone="secondary" numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
    </View>
  );
}

function RecentEntry({ entry }: { entry: JournalPlace }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <Link href={{ pathname: '/place/[id]', params: { id: entry.placeId } }} asChild>
      <PressableScale
        accessibilityRole="link"
        pressedScale={0.985}
        style={StyleSheet.flatten([
          styles.row,
          styles.centered,
          { paddingVertical: spacing.sm, gap: spacing.md },
        ])}>
        <PlaceImage
          uri={entry.imageUrl}
          category={entry.category}
          iconSize={20}
          style={[styles.thumb, { borderRadius: radius.md }]}
        />
        <View style={styles.flex}>
          <Text
            variant="label"
            numberOfLines={1}
            style={{ color: colors.category[entry.category] }}>
            {entry.kind ?? categoryLabel(entry.category)}
          </Text>
          <Text variant="heading" numberOfLines={1} style={{ marginTop: spacing.xxs }}>
            {entry.name}
          </Text>
          <Text variant="small" tone="secondary">
            {formatShortDate(entry.openedAt ?? entry.visitedAt ?? entry.firstSeenAt)}
            {entry.visitedAt ? ' · Visitado' : ''}
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.textTertiary} />
      </PressableScale>
    </Link>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row' },
  centered: { alignItems: 'center' },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  thumb: { width: 68, height: 68 },
});
