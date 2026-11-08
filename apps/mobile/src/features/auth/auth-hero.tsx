import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';

// La portada es igual en ambos temas: es la identidad de la marca.
const GRADIENT = ['#C5522A', '#8F3216', '#4E1D0D'] as const;
const WHITE = '#FFFFFF';
const WHITE_SOFT = 'rgba(255, 255, 255, 0.86)';
const RING_SIZES = [420, 300, 190];

/** Portada del acceso: anillos concéntricos que evocan una lente enfocando. */
export function AuthHero({ compact }: { compact: boolean }) {
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.set(withRepeat(withTiming(1.08, { duration: 3200 }), -1, true));
  }, [scale]);

  const breathing = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <LinearGradient
      colors={GRADIENT}
      style={[styles.hero, { paddingTop: insets.top + (compact ? 28 : 56) }]}>
      <Animated.View style={[styles.rings, breathing]} pointerEvents="none">
        {RING_SIZES.map((size) => (
          <View
            key={size}
            style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }]}
          />
        ))}
      </Animated.View>

      <View style={styles.mark}>
        <View style={styles.markPupil} />
      </View>
      <Text variant="display" style={styles.brand} accessibilityRole="header">
        LENS
      </Text>
      {compact ? null : (
        <Text style={styles.tagline}>Descubre lo interesante que hay a tu alrededor.</Text>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 72,
    overflow: 'hidden',
  },
  rings: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  mark: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markPupil: { width: 18, height: 18, borderRadius: 9, backgroundColor: WHITE },
  brand: { color: WHITE, marginTop: 12, letterSpacing: 6 },
  tagline: { color: WHITE_SOFT, marginTop: 4, textAlign: 'center' },
});
