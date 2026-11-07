import {
  distanceMeters,
  walkingMinutes,
  type Coordinates,
  type NearbyQuery,
  type Place,
  type PlaceDetail,
} from '@lens/shared';

import { TtlCache } from '../lib/cache';
import { AppError, NotFoundError } from '../lib/errors';
import type { Logger } from '../lib/logger';
import { parseOsmId, type OverpassProvider } from '../providers/overpass';
import { normalize } from '../providers/text';
import type { PlaceCandidate } from '../providers/types';
import type { WikipediaProvider } from '../providers/wikipedia';

const NEARBY_TTL_MS = 10 * 60 * 1000;
// Si una fuente falló, el resultado parcial se guarda poco tiempo para reintentar pronto.
const PARTIAL_NEARBY_TTL_MS = 60 * 1000;
const DETAIL_TTL_MS = 60 * 60 * 1000;
const MAX_NEARBY_RESULTS = 80;
// Dos elementos con el mismo nombre a menos de esta distancia son el mismo lugar.
const DUPLICATE_DISTANCE_METERS = 120;

export class PlacesService {
  private readonly nearbyCache = new TtlCache<{ candidates: PlaceCandidate[]; complete: boolean }>(
    NEARBY_TTL_MS,
  );
  private readonly detailCache = new TtlCache<Omit<PlaceDetail, 'distanceMeters' | 'walkMinutes'>>(
    DETAIL_TTL_MS,
  );

  constructor(
    private readonly wikipedia: WikipediaProvider,
    private readonly overpass: OverpassProvider,
    private readonly logger: Logger,
  ) {}

  async nearby(query: NearbyQuery): Promise<Place[]> {
    const center: Coordinates = { lat: query.lat, lon: query.lon };
    const { candidates } = await this.loadCandidates(center, query.radius);

    return candidates
      .filter((candidate) => !query.category || candidate.category === query.category)
      .map((candidate) => withDistance(candidate, center))
      .filter((place) => place.distanceMeters <= query.radius)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, MAX_NEARBY_RESULTS);
  }

  async detail(id: string, from?: Coordinates): Promise<PlaceDetail> {
    const detail = await this.detailCache.getOrLoad(id, () => this.loadDetail(id));
    if (!from) return { ...detail, distanceMeters: 0, walkMinutes: 0 };
    const meters = distanceMeters(from, detail);
    return { ...detail, distanceMeters: Math.round(meters), walkMinutes: walkingMinutes(meters) };
  }

  /**
   * Se redondean las coordenadas a ~100 m para que usuarios cercanos
   * compartan la misma entrada de caché.
   */
  private loadCandidates(center: Coordinates, radius: number) {
    const key = `${center.lat.toFixed(3)},${center.lon.toFixed(3)}:${radius}`;
    return this.nearbyCache.getOrLoad(
      key,
      async () => {
        const [osm, wiki] = await Promise.allSettled([
          this.overpass.nearby(center, radius),
          this.wikipedia.nearby(center, radius),
        ]);

        if (osm.status === 'rejected' && wiki.status === 'rejected') {
          this.logger.error('Ambos proveedores fallaron', {
            osm: describeError(osm.reason),
            wiki: describeError(wiki.reason),
          });
          throw osm.reason;
        }
        // Si solo falla uno, se responde con lo disponible en lugar de fallar.
        if (osm.status === 'rejected') {
          this.logger.warn('Overpass no disponible', { reason: describeError(osm.reason) });
        }
        if (wiki.status === 'rejected') {
          this.logger.warn('Wikipedia no disponible', { reason: describeError(wiki.reason) });
        }

        return {
          candidates: mergeCandidates(
            osm.status === 'fulfilled' ? osm.value : [],
            wiki.status === 'fulfilled' ? wiki.value : [],
          ),
          complete: osm.status === 'fulfilled' && wiki.status === 'fulfilled',
        };
      },
      (result) => (result.complete ? NEARBY_TTL_MS : PARTIAL_NEARBY_TTL_MS),
    );
  }

  private async loadDetail(
    id: string,
  ): Promise<Omit<PlaceDetail, 'distanceMeters' | 'walkMinutes'>> {
    if (id.startsWith('wiki:')) {
      const pageId = Number(id.slice('wiki:'.length));
      if (!Number.isInteger(pageId) || pageId <= 0) throw invalidId();
      const article = await this.wikipedia.byPageId(pageId);
      if (!article) throw new NotFoundError('No encontramos este lugar.');
      const { wikipediaTitle: _omit, ...candidate } = article.candidate;
      return {
        ...candidate,
        description: article.description,
        address: null,
        openingHours: null,
        website: null,
        wikipediaUrl: article.url,
      };
    }

    if (id.startsWith('osm:')) {
      const osmId = parseOsmId(id.slice('osm:'.length));
      if (!osmId) throw invalidId();
      const osm = await this.overpass.byId(osmId.type, osmId.id);
      if (!osm) throw new NotFoundError('No encontramos este lugar.');

      // Si el elemento enlaza a Wikipedia, se completa con la historia del artículo.
      const article = osm.candidate.wikipediaTitle
        ? await this.wikipedia.byTitle(osm.candidate.wikipediaTitle).catch((error: unknown) => {
            this.logger.warn('No se pudo cargar el artículo enlazado', {
              id,
              error: String(error),
            });
            return null;
          })
        : null;

      const { wikipediaTitle: _omit, ...candidate } = osm.candidate;
      return {
        ...candidate,
        summary: candidate.summary ?? article?.candidate.summary ?? null,
        imageUrl: candidate.imageUrl ?? article?.candidate.imageUrl ?? null,
        builtIn: candidate.builtIn ?? article?.candidate.builtIn ?? null,
        description: article?.description ?? osm.description,
        address: osm.address,
        openingHours: osm.openingHours,
        website: osm.website,
        wikipediaUrl: article?.url ?? null,
      };
    }

    throw invalidId();
  }
}

/** Incluye la causa original para que el log sea útil al diagnosticar. */
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  return error.cause instanceof Error ? `${error.message} (${error.cause.message})` : error.message;
}

const invalidId = () => new AppError(400, 'INVALID_ID', 'Identificador de lugar no válido.');

function withDistance(candidate: PlaceCandidate, center: Coordinates): Place {
  const { wikipediaTitle: _omit, ...place } = candidate;
  const meters = distanceMeters(center, candidate);
  return { ...place, distanceMeters: Math.round(meters), walkMinutes: walkingMinutes(meters) };
}

/**
 * Fusiona OSM y Wikipedia. OSM aporta tipo, horarios y gratuidad;
 * Wikipedia aporta foto, historia y año. Se emparejan por la etiqueta
 * `wikipedia` de OSM o, si falta, por nombre y cercanía.
 */
export function mergeCandidates(osm: PlaceCandidate[], wiki: PlaceCandidate[]): PlaceCandidate[] {
  const wikiByTitle = new Map(wiki.map((page) => [normalize(page.name), page]));
  const usedWiki = new Set<string>();

  const merged = osm.map((element) => {
    const byTag = element.wikipediaTitle
      ? wikiByTitle.get(normalize(element.wikipediaTitle))
      : undefined;
    const match =
      byTag ??
      wiki.find(
        (page) =>
          !usedWiki.has(page.id) &&
          normalize(page.name) === normalize(element.name) &&
          distanceMeters(page, element) < DUPLICATE_DISTANCE_METERS,
      );
    if (!match) return element;

    usedWiki.add(match.id);
    return {
      ...element,
      summary: element.summary ?? match.summary,
      imageUrl: element.imageUrl ?? match.imageUrl,
      builtIn: element.builtIn ?? match.builtIn,
      wikipediaTitle: match.wikipediaTitle,
    };
  });

  const remainingWiki = wiki.filter((page) => !usedWiki.has(page.id));
  return dedupeByName([...merged, ...remainingWiki]);
}

/** Elimina repetidos con el mismo nombre muy próximos (p. ej. nodo y área del mismo parque). */
function dedupeByName(places: PlaceCandidate[]): PlaceCandidate[] {
  const result: PlaceCandidate[] = [];
  for (const place of places) {
    // Las obras sin nombre usan su tipo como nombre ("Mural"): no son duplicados entre sí.
    if (place.name === place.kind) {
      result.push(place);
      continue;
    }
    const key = normalize(place.name);
    const duplicate = result.some(
      (kept) =>
        normalize(kept.name) === key && distanceMeters(kept, place) < DUPLICATE_DISTANCE_METERS,
    );
    if (!duplicate) result.push(place);
  }
  return result;
}
