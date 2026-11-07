import type { Category } from '@lens/shared';

import { normalize } from './text';
import type { Classification } from './types';

export type OsmTags = Record<string, string | undefined>;

const ARTWORK_KINDS: Record<string, string> = {
  mural: 'Mural',
  graffiti: 'Arte urbano',
  statue: 'Escultura',
  sculpture: 'Escultura',
  bust: 'Busto',
  installation: 'Instalación',
  mosaic: 'Mosaico',
  relief: 'Relieve',
};

const HISTORIC_KINDS: Record<string, string> = {
  monument: 'Monumento',
  memorial: 'Memorial',
  building: 'Edificio histórico',
  castle: 'Castillo',
  church: 'Iglesia histórica',
  ruins: 'Ruinas',
  archaeological_site: 'Sitio arqueológico',
  fort: 'Fuerte',
  house: 'Casa histórica',
  manor: 'Casona',
  city_gate: 'Puerta histórica',
  bridge: 'Puente histórico',
};

// Elementos históricos pequeños que casi nadie nota: encajan en "poco conocidos".
const MINOR_HISTORIC = new Set([
  'wayside_shrine',
  'wayside_cross',
  'boundary_stone',
  'milestone',
  'plaque',
  'tomb',
  'stone',
]);

const FOOD_KINDS: Record<string, string> = {
  cafe: 'Café',
  restaurant: 'Restaurante',
  bakery: 'Panadería',
  ice_cream: 'Heladería',
  marketplace: 'Mercado',
  coffee: 'Tostador de café',
};

/** Clasifica un elemento de OpenStreetMap a partir de sus etiquetas. */
export function classifyOsm(tags: OsmTags): Classification | null {
  const { tourism, historic, amenity, leisure, shop, natural } = tags;

  if (tourism === 'artwork') {
    return { category: 'art', kind: ARTWORK_KINDS[tags.artwork_type ?? ''] ?? 'Obra de arte' };
  }
  if (tourism === 'gallery' || amenity === 'arts_centre') {
    return { category: 'art', kind: tourism === 'gallery' ? 'Galería' : 'Centro cultural' };
  }
  if (tourism === 'museum') {
    const isArt = tags.museum === 'art';
    return { category: isArt ? 'art' : 'history', kind: isArt ? 'Museo de arte' : 'Museo' };
  }
  if (amenity === 'theatre') {
    return { category: historic ? 'history' : 'art', kind: 'Teatro' };
  }
  if (historic) {
    if (MINOR_HISTORIC.has(historic)) return { category: 'hidden', kind: 'Rincón histórico' };
    return { category: 'history', kind: HISTORIC_KINDS[historic] ?? 'Sitio histórico' };
  }
  if (tourism === 'viewpoint') return { category: 'nature', kind: 'Mirador' };
  if (leisure === 'park') return { category: 'nature', kind: 'Parque' };
  if (leisure === 'garden') return { category: 'nature', kind: 'Jardín' };
  if (leisure === 'nature_reserve' || natural === 'wood') {
    return { category: 'nature', kind: 'Reserva natural' };
  }

  const foodKind = FOOD_KINDS[amenity ?? ''] ?? FOOD_KINDS[shop ?? ''];
  if (foodKind) return { category: 'food', kind: foodKind };

  if (tourism === 'attraction') return { category: 'hidden', kind: 'Curiosidad' };
  return null;
}

/** Determina si la visita es gratuita según la etiqueta `fee` y el tipo de lugar. */
export function inferIsFreeFromOsm(tags: OsmTags, category: Category): boolean | null {
  if (tags.fee === 'no') return true;
  if (tags.fee === 'yes') return false;
  if (category === 'food') return false;
  // Los espacios públicos al aire libre son gratuitos por naturaleza.
  if (
    tags.tourism === 'artwork' ||
    tags.tourism === 'viewpoint' ||
    tags.leisure === 'park' ||
    (tags.historic && !tags.tourism)
  ) {
    return true;
  }
  return null;
}

// Tipos de lugar que en general se pueden visitar sin pagar entrada.
const FREE_KINDS = new Set([
  'Plaza',
  'Monumento',
  'Parque',
  'Mirador',
  'Jardín',
  'Iglesia',
  'Catedral',
  'Templo',
  'Mural',
  'Escultura',
  'Cerro',
  'Cuerpo de agua',
]);

/** Gratuidad aproximada para lugares sin etiqueta de precio (p. ej. artículos de Wikipedia). */
export function inferIsFreeFromKind(kind: string | null): boolean | null {
  return kind && FREE_KINDS.has(kind) ? true : null;
}

// Reglas por palabra clave para artículos de Wikipedia, en orden de prioridad.
const WIKI_RULES: ReadonlyArray<{ pattern: RegExp; category: Category; kind: string }> = [
  { pattern: /\bmuseo de arte|\bpinacoteca/, category: 'art', kind: 'Museo de arte' },
  { pattern: /\bgaleria\b/, category: 'art', kind: 'Galería' },
  { pattern: /\bmural\b/, category: 'art', kind: 'Mural' },
  { pattern: /\bescultura\b|\bestatua\b/, category: 'art', kind: 'Escultura' },
  { pattern: /\bteatro\b/, category: 'history', kind: 'Teatro' },
  { pattern: /\bmuseo\b/, category: 'history', kind: 'Museo' },
  { pattern: /\bcatedral\b/, category: 'history', kind: 'Catedral' },
  { pattern: /\biglesia\b|\btemplo\b|\bbasilica\b/, category: 'history', kind: 'Iglesia' },
  { pattern: /\bcapilla\b|\bconvento\b|\bmonasterio\b/, category: 'history', kind: 'Templo' },
  { pattern: /\bpalacio\b/, category: 'history', kind: 'Palacio' },
  { pattern: /\bmonumento\b/, category: 'history', kind: 'Monumento' },
  { pattern: /\bcastillo\b|\bfuerte\b|\bmuralla\b/, category: 'history', kind: 'Fortificación' },
  { pattern: /\bplaza\b/, category: 'history', kind: 'Plaza' },
  { pattern: /\bedificio\b|\brascacielos\b|\bcasa\b/, category: 'history', kind: 'Edificio' },
  { pattern: /\bmirador\b/, category: 'nature', kind: 'Mirador' },
  { pattern: /\bparque\b/, category: 'nature', kind: 'Parque' },
  { pattern: /\bjardin\b/, category: 'nature', kind: 'Jardín' },
  { pattern: /\bcerro\b|\bmonte\b|\bmontana\b/, category: 'nature', kind: 'Cerro' },
  {
    pattern: /\brio\b|\blago\b|\blaguna\b|\bhumedal\b|\bquebrada\b/,
    category: 'nature',
    kind: 'Cuerpo de agua',
  },
  { pattern: /\bmercado\b/, category: 'food', kind: 'Mercado' },
  { pattern: /\brestaurante\b|\bcafe\b/, category: 'food', kind: 'Restaurante' },
];

// Artículos que no son un lugar para visitar a pie (barrios, vías, entidades).
const WIKI_EXCLUDE =
  /\b(barrio|localidad|municipio|comuna|distrito|estacion|avenida|autopista|calle|carrera|empresa|banco|club|equipo|partido|universidad|colegio|hospital|ministerio|embajada|aeropuerto)\b/;

/**
 * Clasifica un artículo de Wikipedia por su título y descripción.
 * Devuelve null cuando el artículo no describe un lugar visitable.
 */
export function classifyWikipedia(
  title: string,
  description: string | null,
  extract: string | null,
): Classification | null {
  const head = normalize(`${title} ${description ?? ''}`);
  if (WIKI_EXCLUDE.test(head)) return null;

  const body = normalize((extract ?? '').slice(0, 240));
  // Primero se busca en título y descripción; el extracto solo desempata.
  const rule =
    WIKI_RULES.find(({ pattern }) => pattern.test(head)) ??
    WIKI_RULES.find(({ pattern }) => pattern.test(body));
  if (rule) return { category: rule.category, kind: rule.kind };

  // Un artículo enciclopédico sin categoría clara suele ser una curiosidad local.
  return { category: 'hidden', kind: 'Curiosidad' };
}
