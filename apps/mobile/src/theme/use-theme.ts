import { useColorScheme } from 'react-native';

import { palettes, radius, spacing, typography, type Palette } from './tokens';

export interface Theme {
  scheme: 'light' | 'dark';
  colors: Palette;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
}

// Se crean una sola vez para que la referencia sea estable entre renders.
const themes: Record<Theme['scheme'], Theme> = {
  light: { scheme: 'light', colors: palettes.light, spacing, radius, typography },
  dark: { scheme: 'dark', colors: palettes.dark, spacing, radius, typography },
};

/** Tema activo según el modo claro/oscuro del sistema. */
export function useTheme(): Theme {
  return themes[useColorScheme() === 'dark' ? 'dark' : 'light'];
}
