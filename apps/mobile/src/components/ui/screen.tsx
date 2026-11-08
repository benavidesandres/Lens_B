import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/use-theme';

import { Text } from './text';

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  refreshControl?: ScrollViewProps['refreshControl'];
}

/** Contenedor de pantalla con fondo del tema, márgenes seguros y scroll opcional. */
export function Screen({ children, scroll = true, edges = ['top'], refreshControl }: ScreenProps) {
  const { colors, spacing } = useTheme();
  const padding = { paddingHorizontal: spacing.gutter, paddingBottom: spacing.xxxl };

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: colors.background }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={padding}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, padding]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export interface ScreenHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
}

/** Cabecera común de las pestañas principales. */
export function ScreenHeader({ eyebrow, title, description }: ScreenHeaderProps) {
  const { spacing } = useTheme();
  return (
    <View style={{ paddingTop: spacing.lg, gap: spacing.xs }}>
      <Text variant="label" tone="accent">
        {eyebrow}
      </Text>
      <Text variant="display" accessibilityRole="header">
        {title}
      </Text>
      {description ? (
        <Text tone="secondary" style={{ marginTop: spacing.xxs }}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
