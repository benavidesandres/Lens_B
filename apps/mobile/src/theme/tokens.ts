import type { Category } from '@lens/shared';

/**
 * Paleta inspirada en guías de viaje impresas: papel cálido, tinta casi negra
 * y un único acento terracota reservado a las acciones principales.
 * Los textos cumplen un contraste mínimo de 4.5:1 sobre el fondo.
 */
const light = {
  background: '#F6F2EA',
  surface: '#FFFDF9',
  surfaceMuted: '#ECE6DA',
  border: '#E2DBCD',
  borderStrong: '#CBC2B0',
  text: '#1E1B16',
  textSecondary: '#5A554B',
  textTertiary: '#6F695E',
  accent: '#B0431F',
  accentMuted: '#F7E4D9',
  onAccent: '#FFFDF9',
  danger: '#A32E2E',
  dangerMuted: '#F8E3E0',
  success: '#2A7049',
  successMuted: '#DFEFE4',
  overlay: 'rgba(30, 27, 22, 0.45)',
  // Los textos sobre fotografía son siempre claros, en ambos temas.
  onPhoto: '#FFFFFF',
  onPhotoMuted: 'rgba(255, 255, 255, 0.86)',
  shadow: '0px 6px 18px rgba(70, 48, 24, 0.12)',
  category: {
    history: '#8A5A2B',
    food: '#B4501A',
    art: '#3F51A3',
    nature: '#2A7049',
    hidden: '#6C4A94',
  } satisfies Record<Category, string>,
};

export type Palette = typeof light;

const dark: Palette = {
  background: '#12110F',
  surface: '#1E1C19',
  surfaceMuted: '#2B2824',
  border: '#332F2A',
  borderStrong: '#4A453E',
  text: '#F2EEE6',
  textSecondary: '#BAB4A8',
  textTertiary: '#989286',
  accent: '#E58A62',
  accentMuted: '#3D2A20',
  onAccent: '#1A120D',
  danger: '#EE8F8F',
  dangerMuted: '#3C2222',
  success: '#74C799',
  successMuted: '#1F3327',
  overlay: 'rgba(0, 0, 0, 0.6)',
  onPhoto: '#FFFFFF',
  onPhotoMuted: 'rgba(255, 255, 255, 0.86)',
  shadow: '0px 6px 18px rgba(0, 0, 0, 0.4)',
  category: {
    history: '#D2A877',
    food: '#E58A62',
    art: '#9CA9DB',
    nature: '#74C799',
    hidden: '#B9A4D0',
  },
};

export const palettes = { light, dark } as const;

// Escala de espaciado de base 4; `gutter` es el margen lateral de las pantallas.
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  gutter: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

// Tamaño mínimo recomendado para cualquier elemento táctil.
export const MIN_TOUCH_TARGET = 44;

// Los nombres coinciden con las claves cargadas en app/_layout.tsx. Cada peso es
// una familia propia porque Android no sintetiza `fontWeight` en fuentes cargadas.
export const fonts = {
  serif: 'Fraunces_600SemiBold',
  sans: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansBold: 'DMSans_700Bold',
} as const;

export const typography = {
  display: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  title: { fontFamily: fonts.serif, fontSize: 25, lineHeight: 31, letterSpacing: -0.3 },
  heading: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 25, letterSpacing: -0.1 },
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.sansBold, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20 },
  smallStrong: { fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 20 },
  label: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  numeric: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
  },
} as const;

export type TypographyVariant = keyof typeof typography;
