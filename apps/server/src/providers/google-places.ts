import type { Category, Coordinates, PriceLevel, PriceRange } from '@lens/shared';

import { UpstreamError } from '../lib/errors';
import { truncate } from './text';
import type { PlaceCandidate } from './types';

const ENDPOINT = 'https://places.googleapis.com/v1';
const TIMEOUT_MS = 10_000;
// Nearby Search devuelve como máximo 20 resultados por llamada.
const MAX_RESULTS = 20;

/**
 * Prefijo interno de las fotos de Google. Las fotos requieren la clave, así
 * que nunca se envían al teléfono tal cual: la capa HTTP las convierte en
 * una URL del propio servidor (/v1/photos/...).
 */
export const GOOGLE_PHOTO_PREFIX = 'https://lens.invalid/google-photo/';

// Solo se piden los campos que la app usa: Google factura según el field mask.
const LIST_FIELDS = [
  'id',
  'displayName',
  'primaryType',
  'primaryTypeDisplayName',
  'types',
  'location',
  'rating',
  'userRatingCount',
  'priceLevel',
  'priceRange',
  'currentOpeningHours.openNow',
  'photos.name',
  'editorialSummary',
  'businessStatus',
];
const DETAIL_FIELDS = [
  ...LIST_FIELDS,
  'formattedAddress',
  'regularOpeningHours.weekdayDescriptions',
  'websiteUri',
  'nationalPhoneNumber',
  'googleMapsUri',
];

/**
 * Grupos de búsqueda. Cada grupo es una llamada de hasta 20 resultados; así
 * los restaurantes no desplazan a museos y parques en zonas con mucho comercio.
 * Tipos de la tabla A: https://developers.google.com/maps/documentation/places/web-service/place-types
 */
const SEARCH_GROUPS: string[][] = [
  ['cafe', 'coffee_shop', 'bakery', 'restaurant', 'ice_cream_shop', 'market'],
  ['museum', 'historical_landmark', 'monument', 'church', 'tourist_attraction'],
  ['art_gallery', 'cultural_center', 'performing_arts_theater', 'sculpture'],
  ['park', 'plaza', 'garden', 'botanical_garden', 'observation_deck', 'hiking_area'],
];

const TYPE_CATEGORY: Record<string, Category> = {
  cafe: 'food',
  coffee_shop: 'food',
  bakery: 'food',
  restaurant: 'food',
  ice_cream_shop: 'food',
  market: 'food',
  museum: 'history',
  historical_landmark: 'history',
  monument: 'history',
  church: 'history',
  tourist_attraction: 'history',
  art_gallery: 'art',
  cultural_center: 'art',
  performing_arts_theater: 'art',
  sculpture: 'art',
  park: 'nature',
  plaza: 'nature',
  garden: 'nature',
  botanical_garden: 'nature',
  observation_deck: 'nature',
  hiking_area: 'nature',
};

// Lugares a los que normalmente se entra sin pagar.
const USUALLY_FREE_TYPES = new Set([
  'park',
  'plaza',
  'garden',
  'church',
  'monument',
  'historical_landmark',
  'sculpture',
  'observation_deck',
  'hiking_area',
]);

const PRICE_LEVELS: Record<string, PriceLevel> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

interface Money {
  currencyCode?: string;
  units?: string;
}

export interface GooglePlace {
  id: string;
  displayName?: { text?: string };
  primaryType?: string;
  primaryTypeDisplayName?: { text?: string };
  types?: string[];
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  priceRange?: { startPrice?: Money; endPrice?: Money };
  currentOpeningHours?: { openNow?: boolean };
  photos?: { name: string }[];
  editorialSummary?: { text?: string };
  businessStatus?: string;
  formattedAddress?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  websiteUri?: string;
  nationalPhoneNumber?: string;
  googleMapsUri?: string;
}

export interface GooglePlaceDetail {
  candidate: PlaceCandidate;
  address: string | null;
  openingHours: string | null;
  website: string | null;
  phone: string | null;
  mapsUrl: string | null;
}

/** Cliente de Places API (New). La clave vive solo en el servidor. */
export class GooglePlacesProvider {
  constructor(
    private readonly apiKey: string,
    private readonly language: string,
  ) {}

  async nearby(center: Coordinates, radius: number): Promise<PlaceCandidate[]> {
    const results = await Promise.allSettled(
      SEARCH_GROUPS.map((types) => this.searchNearby(center, radius, types)),
    );
    // Si todos los grupos fallan se propaga el error; si falla uno, se sigue con el resto.
    const failure = results.find((result) => result.status === 'rejected');
    if (results.every((result) => result.status === 'rejected')) throw failure!.reason;

    const seen = new Set<string>();
    const candidates: PlaceCandidate[] = [];
    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      for (const place of result.value) {
        if (seen.has(place.id)) continue;
        seen.add(place.id);
        const candidate = toCandidate(place);
        if (candidate) candidates.push(candidate);
      }
    }
    return candidates;
  }

  async byId(placeId: string): Promise<GooglePlaceDetail | null> {
    const params = new URLSearchParams({ languageCode: this.language });
    const place = await this.request<GooglePlace>(
      `/places/${encodeURIComponent(placeId)}?${params}`,
      { method: 'GET' },
      DETAIL_FIELDS,
      { allowNotFound: true },
    );
    if (!place) return null;
    const candidate = toCandidate(place);
    if (!candidate) return null;
    return {
      candidate,
      address: place.formattedAddress ?? null,
      openingHours: place.regularOpeningHours?.weekdayDescriptions?.join('\n') ?? null,
      website: safeUrl(place.websiteUri),
      phone: place.nationalPhoneNumber ?? null,
      mapsUrl: safeUrl(place.googleMapsUri),
    };
  }

  /**
   * Devuelve la URL pública (googleusercontent) de una foto. Esa URL no
   * contiene la clave, así que se puede entregar al teléfono.
   */
  async photoUrl(photoName: string, maxWidthPx = 800): Promise<string | null> {
    const params = new URLSearchParams({
      maxWidthPx: String(maxWidthPx),
      skipHttpRedirect: 'true',
    });
    const media = await this.request<{ photoUri?: string }>(
      `/${photoName}/media?${params}`,
      { method: 'GET' },
      null,
      { allowNotFound: true },
    );
    return media?.photoUri ?? null;
  }

  private async searchNearby(
    center: Coordinates,
    radius: number,
    includedTypes: string[],
  ): Promise<GooglePlace[]> {
    const body = {
      includedTypes,
      maxResultCount: MAX_RESULTS,
      languageCode: this.language,
      rankPreference: 'POPULARITY',
      locationRestriction: {
        circle: { center: { latitude: center.lat, longitude: center.lon }, radius },
      },
    };
    const response = await this.request<{ places?: GooglePlace[] }>(
      '/places:searchNearby',
      { method: 'POST', body: JSON.stringify(body) },
      LIST_FIELDS.map((field) => `places.${field}`),
    );
    return response?.places ?? [];
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    fields: string[] | null,
    options: { allowNotFound?: boolean } = {},
  ): Promise<T | null> {
    let response: Response;
    try {
      response = await fetch(`${ENDPOINT}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          // La clave va en cabecera, no en la URL, para que no aparezca en logs.
          'X-Goog-Api-Key': this.apiKey,
          ...(fields ? { 'X-Goog-FieldMask': fields.join(',') } : {}),
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (cause) {
      throw new UpstreamError('Google Places', cause);
    }

    if (response.status === 404 && options.allowNotFound) return null;
    if (!response.ok) {
      throw new UpstreamError('Google Places', new Error(await describeGoogleError(response)));
    }
    try {
      return (await response.json()) as T;
    } catch (cause) {
      throw new UpstreamError('Google Places', cause);
    }
  }
}

/** Convierte un lugar de Google al formato común. Exportado para los tests. */
export function toCandidate(place: GooglePlace): PlaceCandidate | null {
  const name = place.displayName?.text?.trim();
  if (!name || !place.location) return null;
  // Los negocios cerrados definitivamente no deben aparecer en una app de descubrimiento.
  if (place.businessStatus && place.businessStatus !== 'OPERATIONAL') return null;

  const type = [place.primaryType, ...(place.types ?? [])].find(
    (candidate): candidate is string => candidate !== undefined && candidate in TYPE_CATEGORY,
  );
  const category: Category = type ? TYPE_CATEGORY[type]! : 'hidden';
  const priceLevel = place.priceLevel ? (PRICE_LEVELS[place.priceLevel] ?? null) : null;
  const photo = place.photos?.[0]?.name;
  const summary = place.editorialSummary?.text?.trim();

  return {
    id: `google:${place.id}`,
    name,
    category,
    kind: place.primaryTypeDisplayName?.text ?? null,
    lat: place.location.latitude,
    lon: place.location.longitude,
    summary: summary ? truncate(summary, 220) : null,
    imageUrl: photo ? `${GOOGLE_PHOTO_PREFIX}${photo}` : null,
    builtIn: null,
    isFree: inferIsFree(priceLevel, type),
    rating: place.rating ?? null,
    ratingCount: place.userRatingCount ?? null,
    priceLevel,
    priceRange: toPriceRange(place.priceRange),
    openNow: place.currentOpeningHours?.openNow ?? null,
    source: 'google',
    wikipediaTitle: null,
  };
}

function inferIsFree(priceLevel: PriceLevel | null, type: string | undefined): boolean | null {
  if (priceLevel === 0) return true;
  if (priceLevel !== null) return false;
  if (type && USUALLY_FREE_TYPES.has(type)) return true;
  return null;
}

function toPriceRange(range: GooglePlace['priceRange']): PriceRange | null {
  const currency = range?.startPrice?.currencyCode ?? range?.endPrice?.currencyCode;
  if (!range || !currency) return null;
  const amount = (money?: Money) => (money?.units ? Number(money.units) : null);
  const min = amount(range.startPrice);
  const max = amount(range.endPrice);
  if (min === null && max === null) return null;
  return { min, max, currency };
}

function safeUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Google explica el motivo exacto (API desactivada, facturación, restricción...). */
async function describeGoogleError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: { status?: string; message?: string; details?: { reason?: string }[] };
    };
    const reason = body.error?.details?.find((detail) => detail.reason)?.reason;
    return `HTTP ${response.status} ${body.error?.status ?? ''} ${reason ?? ''} ${body.error?.message ?? ''}`
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return `HTTP ${response.status}`;
  }
}
