import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/use-theme';

import { Text } from './text';

export interface SectionHeaderProps {
  label: string;
  // Texto auxiliar alineado a la derecha, p. ej. "12 lugares".
  meta?: string;
}

/** Encabezado de sección: etiqueta en mayúsculas con una línea fina debajo. */
export function SectionHeader({ label, meta }: SectionHeaderProps) {
  const { colors, spacing } = useTheme();
  return (
    <View
      accessibilityRole="header"
      style={[
        styles.row,
        { borderBottomColor: colors.text, paddingBottom: spacing.sm, marginBottom: spacing.xs },
      ]}>
      <Text variant="label">{label}</Text>
      {meta ? (
        <Text variant="label" tone="tertiary">
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
    alignItems: 'flex-end',
    borderBottomWidth: 1,
  },
});
