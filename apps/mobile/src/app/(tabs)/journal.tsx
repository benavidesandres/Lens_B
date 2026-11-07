import Feather from '@expo/vector-icons/Feather';
import type { Category } from '@lens/shared';
import { Link } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { StateMessage } from '@/components/ui/state-message';
import { Text } from '@/components/ui/text';
import { useJournal } from '@/features/journal/journal-provider';
import { isDiscovered } from '@/features/journal/journal-reducer';
import { CATEGORY_ICONS, CATEGORY_ORDER, categoryLabel } from '@/features/places/category-meta';
import { formatShortDate } from '@/lib/format';
import { useTheme } from '@/theme/use-theme';

// Metas por categoría: dan una sensación de progreso sin convertir la app en un juego.
const CATEGORY_GOAL = 10;
const RECENT_LIMIT = 15;

export default function JournalScreen() {
  const { colors, spacing } = useTheme();
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
      <View style={{ paddingTop: spacing.xl, gap: spacing.xs }}>
        <Text variant="label" tone="tertiary">
          Tu diario
        </Text>
        <Text variant="display" accessibilityRole="header">
          Lo que has descubierto
        </Text>
      </View>

      <View
        style={[
          styles.stats,
          { marginTop: spacing.xl, borderColor: colors.text, paddingVertical: spacing.lg },
        ]}>
        <BigStat value={stats.discovered} label="Descubiertos" />
        <BigStat value={stats.visited} label="Visitados" />
        <BigStat value={stats.routes} label="Rutas" />
      </View>

      <View style={{ marginTop: spacing.xxl }}>
        <SectionHeader label="Por categoría" />
        {CATEGORY_ORDER.map((category) => {
          const count = stats.byCategory[category];
          const progress = Math.min(1, count / CATEGORY_GOAL);
          return (
            <View
              key={category}
              accessibilityLabel={`${categoryLabel(category)}: ${count} de ${CATEGORY_GOAL}`}
              style={{ paddingVertical: spacing.md, gap: spacing.sm }}>
              <View style={styles.row}>
                <View style={[styles.row, { gap: spacing.sm }]}>
                  <Feather
                    name={CATEGORY_ICONS[category]}
                    size={14}
                    color={colors.category[category]}
                  />
                  <Text>{categoryLabel(category)}</Text>
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

      <View style={{ marginTop: spacing.xxl }}>
        <SectionHeader label="Recientes" />
        {stats.recent.length === 0 ? (
          <StateMessage
            icon="book"
            title="Tu diario está vacío"
            description="Abre la ficha de un lugar o completa una ruta y aparecerá aquí."
          />
        ) : (
          stats.recent.map((entry) => (
            <Link
              key={entry.placeId}
              href={{ pathname: '/place/[id]', params: { id: entry.placeId } }}
              asChild>
              <Pressable
                accessibilityRole="link"
                style={({ pressed }) => [
                  styles.row,
                  {
                    paddingVertical: spacing.md,
                    borderBottomColor: colors.border,
                    opacity: pressed ? 0.6 : 1,
                  },
                  styles.entry,
                ]}>
                <View style={styles.flex}>
                  <Text variant="label" style={{ color: colors.category[entry.category] }}>
                    {entry.kind ?? categoryLabel(entry.category)}
                  </Text>
                  <Text variant="heading" numberOfLines={1} style={{ marginTop: spacing.xxs }}>
                    {entry.name}
                  </Text>
                </View>
                <View style={styles.right}>
                  <Text variant="small" tone="tertiary">
                    {formatShortDate(entry.openedAt ?? entry.visitedAt ?? entry.firstSeenAt)}
                  </Text>
                  {entry.visitedAt ? (
                    <Text variant="label" tone="accent">
                      Visitado
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            </Link>
          ))
        )}
      </View>
    </Screen>
  );
}

function BigStat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.flex}>
      <Text variant="display">{value}</Text>
      <Text variant="label" tone="tertiary">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stats: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  track: { height: 3, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 3 },
  entry: { borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  right: { alignItems: 'flex-end', gap: 4 },
});
