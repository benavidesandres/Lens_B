import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import type { TypographyVariant } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Tone = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'danger' | 'onAccent';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  tone?: Tone;
}

/** Texto con la tipografía y los colores del sistema de diseño. */
export function Text({ variant = 'body', tone = 'primary', style, ...rest }: TextProps) {
  const { colors, typography } = useTheme();
  const color = {
    primary: colors.text,
    secondary: colors.textSecondary,
    tertiary: colors.textTertiary,
    accent: colors.accent,
    danger: colors.danger,
    onAccent: colors.onAccent,
  }[tone];

  return <RNText {...rest} style={[typography[variant], { color }, style]} />;
}
