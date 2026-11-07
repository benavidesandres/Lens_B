import type { Category } from '@lens/shared';

import { normalize } from '../../providers/text';

export interface RouteIntent {
  minutes: number;
  freeOnly: boolean;
  categories: Category[];
}

export const DEFAULT_ROUTE_MINUTES = 60;
const MIN_ROUTE_MINUTES = 15;
const MAX_ROUTE_MINUTES = 240;

const NUMBER_WORDS: Record<string, number> = { un: 1, una: 1, dos: 2, tres: 3, cuatro: 4 };

const CATEGORY_KEYWORDS: ReadonlyArray<[Category, RegExp]> = [
  ['art', /\b(arte|artistic\w*|mural\w*|museo\w*|galeri\w*|grafiti\w*|escultur\w*)\b/],
  ['history', /\b(histori\w*|antigu\w*|patrimoni\w*|arquitectur\w*|colonial\w*|iglesia\w*)\b/],
  ['food', /\b(comer|comida|cafe\w*|gastronom\w*|restaurante\w*|almorzar|desayun\w*|postre\w*)\b/],
  ['nature', /\b(naturaleza|parque\w*|verde\w*|arbol\w*|jardin\w*|mirador\w*|aire libre)\b/],
  ['hidden', /\b(misteri\w*|leyenda\w*|curios\w*|escondid\w*|desconocid\w*|secret\w*|raro\w*)\b/],
];

const FREE_PATTERN =
  /\b(gratis|gratuit\w*|sin (gastar|pagar|dinero|plata)|no quiero gastar|no gastar|presupuesto cero)\b/;

/**
 * Interpreta de forma determinista una petición en lenguaje natural.
 * Lo usa el planificador local y sirve de referencia para validar la IA.
 */
export function parseIntent(prompt: string): RouteIntent {
  const text = normalize(prompt);
  return {
    minutes: parseMinutes(text),
    freeOnly: FREE_PATTERN.test(text),
    categories: CATEGORY_KEYWORDS.filter(([, pattern]) => pattern.test(text)).map(
      ([category]) => category,
    ),
  };
}

function parseMinutes(text: string): number {
  const clamp = (value: number) =>
    Math.min(MAX_ROUTE_MINUTES, Math.max(MIN_ROUTE_MINUTES, Math.round(value)));

  if (/\bhora y media\b/.test(text)) {
    const hours = /\b(\d+|un|una|dos|tres)\s+hora y media\b/.exec(text)?.[1];
    return clamp(((hours ? toNumber(hours) : 1) + 0.5) * 60);
  }
  if (/\bmedia hora\b/.test(text)) return 30;

  const hours = /\b(\d+(?:[.,]\d+)?|un|una|dos|tres|cuatro)\s*(h|hr|hrs|hora|horas)\b/.exec(text);
  const minutes = /\b(\d+)\s*(m|min|mins|minuto|minutos)\b/.exec(text);

  let total = 0;
  if (hours?.[1]) total += toNumber(hours[1]) * 60;
  if (minutes?.[1]) total += Number(minutes[1]);
  return total > 0 ? clamp(total) : DEFAULT_ROUTE_MINUTES;
}

function toNumber(token: string): number {
  return NUMBER_WORDS[token] ?? Number(token.replace(',', '.'));
}
