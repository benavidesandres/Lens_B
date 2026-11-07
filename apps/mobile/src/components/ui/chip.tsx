import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/theme/use-theme';

import { Text } from './text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
}

/** Filtro seleccionable. Seleccionado se invierte a tinta sobre papel. */
export function Chip({ label, selected = false, onPress }: ChipProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        {
          paddingHorizontal: spacing.md,
          borderRadius: radius.sm,
          backgroundColor: selected ? colors.text : 'transparent',
          borderColor: selected ? colors.text : colors.borderStrong,
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      <Text variant="small" style={{ color: selected ? colors.background : colors.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 32,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
