const numberFormatter = new Intl.NumberFormat('es', { maximumFractionDigits: 1 });

/** "80 m", "350 m", "1,2 km". Se redondea para no aparentar una precisión que el GPS no tiene. */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  return `${numberFormatter.format(meters / 1000)} km`;
}

/** "4 min", "1 h 05 min". */
export function formatMinutes(minutes: number): string {
  // Un lugar a pocos metros nunca se muestra como "0 min".
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')} min`;
}

export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';

export function dayPart(date = new Date()): DayPart {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 19) return 'afternoon';
  if (hour >= 19 && hour < 23) return 'evening';
  return 'night';
}

export function greeting(date = new Date()): string {
  switch (dayPart(date)) {
    case 'morning':
      return 'Buenos días';
    case 'afternoon':
      return 'Buenas tardes';
    default:
      return 'Buenas noches';
  }
}

/** Fecha corta en español: "7 nov". */
export function formatShortDate(timestamp: number): string {
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(timestamp);
}

const ratingFormatter = new Intl.NumberFormat('es', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const countFormatter = new Intl.NumberFormat('es');

/** "4,6", para mostrar junto a un icono de estrella. */
export function formatRatingValue(rating: number): string {
  return ratingFormatter.format(rating);
}

/** "4,6 ★" o, con reseñas, "4,6 ★ (1.234 reseñas)". */
export function formatRating(rating: number, count?: number | null): string {
  const base = `${ratingFormatter.format(rating)} ★`;
  return count ? `${base} (${countFormatter.format(count)} reseñas)` : base;
}

/** Nivel de precio de Google como símbolos: 0 → "Gratis", 1 → "$", 4 → "$$$$". */
export function formatPriceLevel(level: number): string {
  return level === 0 ? 'Gratis' : '$'.repeat(level);
}

const PRICE_LEVEL_NAMES = ['Gratis', 'Económico', 'Moderado', 'Caro', 'Muy caro'];

export function priceLevelName(level: number): string {
  return PRICE_LEVEL_NAMES[level] ?? '';
}

/** "$ 10.000 – $ 20.000 por persona", en la moneda que indique Google. */
export function formatPriceRange(range: {
  min: number | null;
  max: number | null;
  currency: string;
}): string {
  const money = new Intl.NumberFormat('es', {
    style: 'currency',
    currency: range.currency,
    maximumFractionDigits: 0,
  });
  if (range.min !== null && range.max !== null) {
    return `${money.format(range.min)} – ${money.format(range.max)} por persona`;
  }
  if (range.min !== null) return `Desde ${money.format(range.min)} por persona`;
  return `Hasta ${money.format(range.max ?? 0)} por persona`;
}
