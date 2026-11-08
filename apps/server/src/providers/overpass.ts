import type { Coordinates } from '@lens/shared';

import { UpstreamError } from '../lib/errors';
import type { HttpClient } from '../lib/http';
import { classifyOsm, inferIsFreeFromOsm, type OsmTags } from './classify';
import { extractYear, truncate } from './text';
import type { PlaceCandidate } from './types';

type OsmElementType = 'node' | 'way' | 'relation';

interface OsmElement {
  type: OsmElementType;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: OsmTags;
}

interface OverpassResponse {
  elements: OsmElement[];
}

export interface OsmDetail {
  candidate: PlaceCandidate;
  address: string | null;
  openingHours: string | null;
  website: string | null;
  description: string | null;
}

const MAX_RESULTS = 250;

/**
 * Consulta Overpass QL con los tipos de lugar que interesan a LENS.
 * Las obras de arte se incluyen aunque no tengan nombre (muchos murales no lo tienen).
 */
function buildNearbyQuery({ lat, lon }: Coordinates, radius: number): string {
  const around = `(around:${radius},${lat},${lon})`;
  return `
[out:json][timeout:10];
(
  nwr${around}["tourism"="artwork"];
  nwr${around}["tourism"~"^(museum|gallery|viewpoint|attraction)$"]["name"];
  nwr${around}["historic"]["name"];
  nwr${around}["amenity"~"^(cafe|restaurant|bakery|ice_cream|marketplace|theatre|arts_centre)$"]["name"];
  nwr${around}["leisure"~"^(park|garden|nature_reserve)$"]["name"];
  nwr${around}["shop"~"^(bakery|coffee)$"]["name"];
);
out center tags ${MAX_RESULTS};
`;
}

export class OverpassProvider {
  /**
   * @param endpoints Servidores Overpass en orden de preferencia. Los públicos
   * se saturan con frecuencia, por eso se prueba el siguiente si uno falla.
   */
  constructor(
    private readonly http: HttpClient,
    private readonly endpoints: readonly string[],
    private readonly retryDelayMs = 800,
  ) {
    if (endpoints.length === 0) throw new Error('Se necesita al menos un servidor Overpass.');
  }

  async nearby(center: Coordinates, radiusMeters: number): Promise<PlaceCandidate[]> {
    const data = await this.run(buildNearbyQuery(center, radiusMeters));
    return data.elements.flatMap((element) => {
      const candidate = toCandidate(element);
      return candidate ? [candidate] : [];
    });
  }

  async byId(type: OsmElementType, id: number): Promise<OsmDetail | null> {
    const data = await this.run(`[out:json][timeout:10];${type}(id:${id});out center tags;`);
    const element = data.elements[0];
    if (!element) return null;

    const candidate = toCandidate(element);
    if (!candidate) return null;

    const tags = element.tags ?? {};
    return {
      candidate,
      address: formatAddress(tags),
      openingHours: tags.opening_hours ?? null,
      website: safeUrl(tags.website ?? tags['contact:website']),
      description: tags.description ?? tags.inscription ?? null,
    };
  }

  // Circuit breaker: tras fallar todos los servidores, se deja de consultar
  // durante un tiempo para no hacer esperar a cada usuario por un timeout.
  private unavailableUntil = 0;
  private static readonly COOLDOWN_MS = 60_000;

  /** Prueba cada servidor en orden, esperando un poco más entre cada intento. */
  private async run(query: string): Promise<OverpassResponse> {
    if (Date.now() < this.unavailableUntil) {
      throw new UpstreamError('OpenStreetMap', new Error('circuit open'));
    }

    const body = new URLSearchParams({ data: query }).toString();
    let lastError: unknown;

    for (const [attempt, endpoint] of this.endpoints.entries()) {
      if (attempt > 0) await sleep(this.retryDelayMs * 2 ** (attempt - 1));
      try {
        const response = await this.http<OverpassResponse>(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        });
        this.unavailableUntil = 0;
        return response;
      } catch (error) {
        lastError = error;
      }
    }

    this.unavailableUntil = Date.now() + OverpassProvider.COOLDOWN_MS;
    throw lastError;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function parseOsmId(raw: string): { type: OsmElementType; id: number } | null {
  const match = /^(node|way|relation):(\d+)$/.exec(raw);
  if (!match) return null;
  return { type: match[1] as OsmElementType, id: Number(match[2]) };
}

function toCandidate(element: OsmElement): PlaceCandidate | null {
  const tags = element.tags ?? {};
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  if (lat === undefined || lon === undefined) return null;

  const classification = classifyOsm(tags);
  if (!classification) return null;

  const name = tags['name:es'] ?? tags.name ?? classification.kind;
  if (!name) return null;

  const text = tags.description ?? tags.inscription;

  return {
    id: `osm:${element.type}:${element.id}`,
    name,
    category: classification.category,
    kind: classification.kind,
    lat,
    lon,
    summary: text ? truncate(text, 220) : null,
    imageUrl: safeUrl(tags.image),
    builtIn: extractYear(tags.start_date),
    isFree: inferIsFreeFromOsm(tags, classification.category),
    rating: null,
    ratingCount: null,
    priceLevel: null,
    priceRange: null,
    openNow: null,
    source: 'osm',
    wikipediaTitle: parseWikipediaTag(tags.wikipedia),
  };
}

/** La etiqueta `wikipedia` tiene la forma "es:Título del artículo". */
function parseWikipediaTag(value: string | undefined): string | null {
  if (!value) return null;
  const separator = value.indexOf(':');
  return separator > 0 ? value.slice(separator + 1) : value;
}

function formatAddress(tags: OsmTags): string | null {
  const street = tags['addr:street'];
  if (!street) return null;
  const number = tags['addr:housenumber'];
  return number ? `${street} ${number}` : street;
}

/** Solo se aceptan URLs http(s) válidas; OSM contiene valores muy heterogéneos. */
function safeUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}
