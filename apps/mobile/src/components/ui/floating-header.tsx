import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/use-theme';

import { IconButton } from './icon-button';

/** Botón de volver flotante, para pantallas cuyo contenido llega hasta el borde superior. */
export function FloatingHeader({ right }: { right?: ReactNode }) {
  const { spacing } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.bar, { top: insets.top + spacing.sm, paddingHorizontal: spacing.lg }]}>
      <IconButton
        icon="arrow-left"
        label="Volver"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      />
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
