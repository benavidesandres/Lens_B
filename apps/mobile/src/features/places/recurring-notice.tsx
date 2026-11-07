import Feather from '@expo/vector-icons/Feather';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import type { JournalPlace } from '@/features/journal/journal-schema';
import { useTheme } from '@/theme/use-theme';

/**
 * Aviso para un lugar por el que el usuario pasa a menudo sin haberlo abierto:
 * convierte la rutina diaria en una invitación a mirar con otros ojos.
 */
export function RecurringNotice({ entry }: { entry: JournalPlace }) {
  const { colors, spacing, radius } = useTheme();

  return (
    <Link href={{ pathname: '/place/[id]', params: { id: entry.placeId } }} asChild>
      <Pressable
        accessibilityRole="link"
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.accentMuted,
            borderRadius: radius.md,
            padding: spacing.lg,
            gap: spacing.xs,
            opacity: pressed ? 0.8 : 1,
          },
        ]}>
        <View style={[styles.header, { gap: spacing.xs }]}>
          <Feather name="repeat" size={12} color={colors.accent} />
          <Text variant="label" tone="accent">
            Has pasado por aquí {entry.passCount} veces
          </Text>
        </View>
        <Text variant="heading">{entry.name}</Text>
        {entry.summary ? (
          <Text tone="secondary" numberOfLines={2}>
            {entry.summary}
          </Text>
        ) : (
          <Text tone="secondary">Quizá sea el momento de detenerse a mirarlo.</Text>
        )}
        <Text variant="bodyStrong" tone="accent" style={{ marginTop: spacing.xs }}>
          Conocer su historia
        </Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {},
  header: { flexDirection: 'row', alignItems: 'center' },
});
