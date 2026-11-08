import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/use-theme';

import { Button } from './button';
import { Text } from './text';

export interface StateMessageProps {
  icon: ComponentProps<typeof Feather>['name'];
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Mensaje para estados vacíos o de error, con una acción opcional. */
export function StateMessage({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: StateMessageProps) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.container, { paddingVertical: spacing.xxl, gap: spacing.sm }]}>
      <View style={[styles.badge, { backgroundColor: colors.accentMuted }]}>
        <Feather name={icon} size={26} color={colors.accent} />
      </View>
      <Text variant="heading" style={[styles.center, { marginTop: spacing.sm }]}>
        {title}
      </Text>
      {description ? (
        <Text tone="secondary" style={styles.center}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={{ marginTop: spacing.md }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    textAlign: 'center',
  },
});
