import Feather from '@expo/vector-icons/Feather';
import type { Category } from '@lens/shared';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/use-theme';

import { CATEGORY_ICONS } from './category-meta';

export interface PlaceImageProps {
  uri: string | null;
  category: Category;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
}

/** Fotografía de un lugar; si no existe o falla, muestra el icono de su categoría. */
export function PlaceImage({ uri, category, style, iconSize = 24 }: PlaceImageProps) {
  const { colors } = useTheme();
  const [failedUri, setFailedUri] = useState<string | null>(null);

  return (
    <View style={[styles.frame, { backgroundColor: colors.surfaceMuted }, style]}>
      {uri && uri !== failedUri ? (
        <Image
          source={uri}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={250}
          onError={() => setFailedUri(uri)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Feather
          name={CATEGORY_ICONS[category]}
          size={iconSize}
          color={colors.category[category]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
