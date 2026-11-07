import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/use-theme';

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  refreshControl?: ScrollViewProps['refreshControl'];
}

/** Contenedor de pantalla con fondo del tema, márgenes seguros y scroll opcional. */
export function Screen({ children, scroll = true, edges = ['top'], refreshControl }: ScreenProps) {
  const { colors, spacing } = useTheme();
  const padding = { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl };

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: colors.background }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={padding}
          refreshControl={refreshControl}
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
