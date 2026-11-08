import type { Coordinates } from '@lens/shared';
import { forwardRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/theme/use-theme';

export interface LensMapProps {
  center: Coordinates;
  span?: number;
  children?: ReactNode;
  onPress?: () => void;
  bottomPadding?: number;
}

/**
 * react-native-maps no tiene implementación web. En navegador se muestra un
 * panel neutro para que el resto de la app siga siendo usable al desarrollar.
 */
export const LensMap = forwardRef<unknown, LensMapProps>(function LensMap({ center }, _ref) {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.center,
        { backgroundColor: colors.surfaceMuted, gap: spacing.xs },
      ]}>
      <Text variant="label" tone="tertiary">
        Mapa disponible en iOS y Android
      </Text>
      <Text variant="numeric" tone="tertiary">
        {center.lat.toFixed(4)}, {center.lon.toFixed(4)}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
