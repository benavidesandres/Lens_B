import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import type { ViewStyle } from 'react-native';

import { useTheme } from '@/theme/use-theme';

import { PressableScale } from './pressable-scale';

export interface IconButtonProps {
  icon: ComponentProps<typeof Feather>['name'];
  // Obligatorio: es lo único que anuncia el lector de pantalla.
  label: string;
  onPress: () => void;
  size?: number;
  style?: ViewStyle;
}

/** Botón circular flotante, para acciones sobre mapas y fotografías. */
export function IconButton({ icon, label, onPress, size = 44, style }: IconButtonProps) {
  const { colors } = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      pressedScale={0.92}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface,
          boxShadow: colors.shadow,
        },
        style,
      ]}>
      <Feather name={icon} size={Math.round(size * 0.44)} color={colors.text} />
    </PressableScale>
  );
}
