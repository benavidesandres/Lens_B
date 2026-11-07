/** Minúsculas y sin tildes, para comparar texto en español de forma robusta. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** Recorta un texto en el último límite de frase o palabra antes de `max`. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const sentenceEnd = slice.lastIndexOf('. ');
  if (sentenceEnd > max * 0.5) return slice.slice(0, sentenceEnd + 1);
  const wordEnd = slice.lastIndexOf(' ');
  return `${slice.slice(0, wordEnd > 0 ? wordEnd : max)}…`;
}

/** Extrae el primer año de 4 dígitos plausible de una fecha libre ("1924-05", "c. 1890"). */
export function extractYear(value: string | undefined | null): string | null {
  if (!value) return null;
  const match = /\b(1[0-9]{3}|20[0-9]{2})\b/.exec(value);
  return match?.[1] ?? null;
}

/**
 * Busca en un texto enciclopédico el año de construcción o fundación,
 * p. ej. "fue construido entre 1920 y 1924" devuelve "1920".
 */
export function extractBuiltYear(text: string | null): string | null {
  if (!text) return null;
  const match =
    /(construid[oa]s?|inaugurad[oa]s?|edificad[oa]s?|fundad[oa]s?|levantad[oa]s?|erigid[oa]s?)[^.]{0,50}?\b(1[0-9]{3}|20[0-2][0-9])\b/i.exec(
      text,
    );
  return match?.[2] ?? null;
}
