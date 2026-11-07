const numberFormatter = new Intl.NumberFormat('es', { maximumFractionDigits: 1 });

/** "80 m", "350 m", "1,2 km". Se redondea para no aparentar una precisión que el GPS no tiene. */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  return `${numberFormatter.format(meters / 1000)} km`;
}

/** "4 min", "1 h 05 min". */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
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
