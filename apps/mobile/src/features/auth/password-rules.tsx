import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/theme/use-theme';

const RULES = [
  { label: 'Al menos 8 caracteres', test: (value: string) => value.length >= 8 },
  { label: 'Una letra', test: (value: string) => /\p{L}/u.test(value) },
  { label: 'Un número', test: (value: string) => /\d/.test(value) },
];

export const isPasswordValid = (value: string) => RULES.every((rule) => rule.test(value));

/** Requisitos de la contraseña, que se marcan a medida que se cumplen. */
export function PasswordRules({ value }: { value: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.wrap, { columnGap: spacing.md, rowGap: spacing.xs }]}>
      {RULES.map((rule) => {
        const passed = rule.test(value);
        return (
          <View key={rule.label} style={[styles.rule, { gap: spacing.xs }]}>
            <Feather
              name={passed ? 'check-circle' : 'circle'}
              size={14}
              color={passed ? colors.success : colors.textTertiary}
            />
            <Text variant="small" style={{ color: passed ? colors.success : colors.textTertiary }}>
              {rule.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  rule: { flexDirection: 'row', alignItems: 'center' },
});
