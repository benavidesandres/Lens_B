import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import type { ComponentProps } from 'react';
import { Platform, StyleSheet } from 'react-native';

import { useTheme } from '@/theme/use-theme';

import { PressableScale } from './pressable-scale';
import { Text } from './text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: ComponentProps<typeof Feather>['name'];
  // Añade sombra para que el filtro se lea sobre el mapa.
  floating?: boolean;
}

/** Filtro seleccionable. Seleccionado se invierte a tinta sobre papel. */
export function Chip({ label, selected = false, onPress, icon, floating = false }: ChipProps) {
  const { colors, radius, spacing } = useTheme();
  const foreground = selected ? colors.background : colors.text;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={() => {
        if (Platform.OS !== 'web') void Haptics.selectionAsync();
        onPress();
      }}
      style={[
        styles.base,
        {
          gap: spacing.xs + 2,
          paddingHorizontal: spacing.lg - 2,
          borderRadius: radius.pill,
          backgroundColor: selected ? colors.text : colors.surface,
          borderColor: selected ? colors.text : colors.border,
          boxShadow: floating ? colors.shadow : undefined,
        },
      ]}>
      {icon ? <Feather name={icon} size={15} color={foreground} /> : null}
      <Text variant="smallStrong" style={{ color: foreground }}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
