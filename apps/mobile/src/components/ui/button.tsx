import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/use-theme';

import { PressableScale } from './pressable-scale';
import { Text } from './text';

type Variant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: ComponentProps<typeof Feather>['name'];
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  style,
  accessibilityHint,
}: ButtonProps) {
  const { colors, radius, spacing } = useTheme();
  const isDisabled = disabled || loading;

  const palette = {
    primary: { background: colors.accent, border: colors.accent, foreground: colors.onAccent },
    secondary: { background: colors.surface, border: colors.borderStrong, foreground: colors.text },
    ghost: { background: 'transparent', border: 'transparent', foreground: colors.accent },
  }[variant];

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={[
        styles.base,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          borderRadius: radius.md,
          paddingHorizontal: variant === 'ghost' ? spacing.sm : spacing.lg,
          // Durante la carga se mantiene el color: la acción sigue en curso.
          opacity: disabled && !loading ? 0.45 : 1,
        },
        style,
      ]}>
      <View style={[styles.content, { gap: spacing.sm }]}>
        {loading ? (
          <ActivityIndicator size="small" color={palette.foreground} />
        ) : icon ? (
          <Feather name={icon} size={18} color={palette.foreground} />
        ) : null}
        <Text
          variant="bodyStrong"
          numberOfLines={1}
          style={[styles.label, { color: palette.foreground }]}>
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
  },
  label: { flexShrink: 1 },
});
