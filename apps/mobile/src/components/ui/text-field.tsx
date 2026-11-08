import Feather from '@expo/vector-icons/Feather';
import { useState, type ComponentProps, type ComponentRef, type Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { typography } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { Text } from './text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  icon: ComponentProps<typeof Feather>['name'];
  error?: string | null;
  // Añade el botón para mostrar u ocultar el contenido.
  password?: boolean;
  ref?: Ref<ComponentRef<typeof TextInput>>;
}

/** Campo de formulario con etiqueta, icono y mensaje de error. */
export function TextField({
  label,
  icon,
  error,
  password = false,
  onFocus,
  onBlur,
  ref,
  ...rest
}: TextFieldProps) {
  const { colors, spacing, radius } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.accent : colors.border;

  return (
    <View style={{ gap: spacing.xs + 2 }}>
      <Text variant="smallStrong">{label}</Text>
      <View
        style={[
          styles.box,
          {
            gap: spacing.sm + 2,
            paddingLeft: spacing.lg - 2,
            borderRadius: radius.md,
            borderColor,
            backgroundColor: colors.surface,
          },
        ]}>
        <Feather name={icon} size={18} color={focused ? colors.accent : colors.textTertiary} />
        <TextInput
          {...rest}
          ref={ref}
          accessibilityLabel={label}
          secureTextEntry={password && !revealed}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.accent}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[typography.body, styles.input, { color: colors.text }]}
        />
        {password ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onPress={() => setRevealed(!revealed)}
            style={styles.reveal}>
            <Feather name={revealed ? 'eye-off' : 'eye'} size={18} color={colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="small" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    paddingRight: 4,
  },
  input: { flex: 1, paddingVertical: 12 },
  reveal: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
