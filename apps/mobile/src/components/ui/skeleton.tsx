import { useEffect } from 'react';
import type { DimensionValue, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme/use-theme';

export interface SkeletonProps {
  width?: DimensionValue;
  height: number;
  style?: ViewStyle;
}

/** Marcador de carga con pulso suave de opacidad. */
export function Skeleton({ width = '100%', height, style }: SkeletonProps) {
  const { colors, radius } = useTheme();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted },
        animated,
        style,
      ]}
    />
  );
}
