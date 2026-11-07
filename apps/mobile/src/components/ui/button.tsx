import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/use-theme';

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
    primary: { background: colors.text, border: colors.text, foreground: colors.background },
    secondary: { background: 'transparent', border: colors.borderStrong, foreground: colors.text },
    ghost: { background: 'transparent', border: 'transparent', foreground: colors.accent },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          borderRadius: radius.md,
          paddingHorizontal: variant === 'ghost' ? spacing.xs : spacing.lg,
          opacity: isDisabled ? 0.5 : pressed ? 0.75 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.foreground} />
      ) : (
        <View style={[styles.content, { gap: spacing.sm }]}>
          {icon ? <Feather name={icon} size={16} color={palette.foreground} /> : null}
          <Text variant="bodyStrong" style={{ color: palette.foreground }}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 46,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
