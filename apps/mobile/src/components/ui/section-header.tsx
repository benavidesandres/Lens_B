import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/use-theme';

import { Text } from './text';

export interface SectionHeaderProps {
  label: string;
  // Texto auxiliar alineado a la derecha, p. ej. "12 lugares".
  meta?: string;
}

/** Encabezado de sección. */
export function SectionHeader({ label, meta }: SectionHeaderProps) {
  const { spacing } = useTheme();
  return (
    <View accessibilityRole="header" style={[styles.row, { marginBottom: spacing.sm }]}>
      <Text variant="title" style={styles.title}>
        {label}
      </Text>
      {meta ? (
        <Text variant="small" tone="tertiary">
          {meta}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
  },
  title: { flexShrink: 1, fontSize: 22, lineHeight: 28 },
});
