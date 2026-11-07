import type { Category } from '@lens/shared';
import { Platform } from 'react-native';

/**
 * Paleta sobria inspirada en guías impresas: papel cálido, tinta casi negra
 * y un único acento terracota. Los colores de categoría son apagados a propósito
 * para que la información, y no los iconos, sea lo protagonista.
 */
const light = {
  background: '#F4F1EA',
  surface: '#FBFAF6',
  surfaceMuted: '#ECE8DE',
  border: '#DDD7CA',
  borderStrong: '#C9C1B0',
  text: '#1C1B18',
  textSecondary: '#5F5B52',
  textTertiary: '#8C877B',
  accent: '#9A3B1E',
  accentMuted: '#F1E2D9',
  onAccent: '#FBFAF6',
  danger: '#8E2A2A',
  overlay: 'rgba(28, 27, 24, 0.45)',
  category: {
    history: '#7A5230',
    food: '#9A3B1E',
    art: '#3E4C7A',
    nature: '#3F6B4A',
    hidden: '#5B4A6B',
  } satisfies Record<Category, string>,
};

export type Palette = typeof light;

const dark: Palette = {
  background: '#141412',
  surface: '#1C1B19',
  surfaceMuted: '#262522',
  border: '#34322E',
  borderStrong: '#48453F',
  text: '#ECE9E1',
  textSecondary: '#A8A397',
  textTertiary: '#77736A',
  accent: '#D27A55',
  accentMuted: '#3A2A22',
  onAccent: '#141412',
  danger: '#D47070',
  overlay: 'rgba(0, 0, 0, 0.55)',
  category: {
    history: '#C49A6C',
    food: '#D27A55',
    art: '#8E9BCB',
    nature: '#86B08F',
    hidden: '#A895BB',
  },
};

export const palettes = { light, dark } as const;

// Escala de espaciado de base 4.
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
} as const;

export const fonts = {
  // Serif para titulares: da un tono editorial y evita el aspecto genérico de app.
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }),
  sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui, sans-serif' }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, monospace' }),
} as const;

export const typography = {
  display: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 38, letterSpacing: -0.4 },
  title: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 30, letterSpacing: -0.2 },
  heading: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 25 },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, fontWeight: '600' },
  small: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18 },
  // Etiquetas en mayúsculas espaciadas, al estilo de una ficha técnica.
  label: {
    fontFamily: fonts.sans,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  numeric: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 18 },
} as const;

export type TypographyVariant = keyof typeof typography;
