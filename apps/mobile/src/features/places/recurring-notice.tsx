import Feather from '@expo/vector-icons/Feather';
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
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
      <PressableScale
        accessibilityRole="link"
        pressedScale={0.98}
        style={{
          backgroundColor: colors.accentMuted,
          borderRadius: radius.lg,
          padding: spacing.lg,
          gap: spacing.xs,
        }}>
        <View style={[styles.row, { gap: spacing.xs + 2 }]}>
          <Feather name="repeat" size={13} color={colors.accent} />
          <Text variant="label" tone="accent">
            Has pasado por aquí {entry.passCount} veces
          </Text>
        </View>
        <Text variant="heading">{entry.name}</Text>
        <Text tone="secondary" numberOfLines={2}>
          {entry.summary ?? 'Quizá sea el momento de detenerse a mirarlo.'}
        </Text>
        <View style={[styles.row, { gap: spacing.xs, marginTop: spacing.xs }]}>
          <Text variant="bodyStrong" tone="accent">
            Conocer su historia
          </Text>
          <Feather name="arrow-right" size={16} color={colors.accent} />
        </View>
      </PressableScale>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
