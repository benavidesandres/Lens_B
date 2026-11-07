import type { Coordinates } from '@lens/shared';

import type { HttpClient } from '../lib/http';
import { classifyWikipedia, inferIsFreeFromKind } from './classify';
import { extractBuiltYear, truncate } from './text';
import type { PlaceCandidate } from './types';

// Forma de las páginas que devuelve la API de MediaWiki con formatversion=2.
interface WikiPage {
  pageid: number;
  title: string;
  missing?: boolean;
  description?: string;
  extract?: string;
  fullurl?: string;
  coordinates?: Array<{ lat: number; lon: number }>;
  thumbnail?: { source: string };
}

interface WikiQueryResponse {
  query?: { pages?: WikiPage[] };
}

export interface WikipediaArticle {
  candidate: PlaceCandidate;
  description: string | null;
  url: string | null;
}

const SUMMARY_MAX_CHARS = 220;
// La API de extractos solo devuelve el texto de los primeros 20 resultados con
// exintro; el resto usa la descripción corta, que es suficiente para listas.
const GEOSEARCH_LIMIT = 50;

export class WikipediaProvider {
  private readonly endpoint: string;

  constructor(
    private readonly http: HttpClient,
    readonly language: string,
  ) {
    this.endpoint = `https://${language}.wikipedia.org/w/api.php`;
  }

  /** Artículos de Wikipedia geolocalizados dentro del radio indicado. */
  async nearby(center: Coordinates, radiusMeters: number): Promise<PlaceCandidate[]> {
    const data = await this.query({
      generator: 'geosearch',
      ggscoord: `${center.lat}|${center.lon}`,
      // La API de geosearch acepta como máximo 10 km.
      ggsradius: String(Math.min(radiusMeters, 10_000)),
      ggslimit: String(GEOSEARCH_LIMIT),
      prop: 'coordinates|pageimages|extracts|description',
      exintro: '1',
      explaintext: '1',
      exsentences: '3',
      exlimit: 'max',
      piprop: 'thumbnail',
      pithumbsize: '800',
    });

    return (data.query?.pages ?? []).flatMap((page) => {
      const candidate = this.toCandidate(page);
      return candidate ? [candidate] : [];
    });
  }

  /** Artículo completo (introducción) por id de página. */
  async byPageId(pageId: number): Promise<WikipediaArticle | null> {
    return this.article({ pageids: String(pageId) });
  }

  /** Artículo completo (introducción) por título exacto. */
  async byTitle(title: string): Promise<WikipediaArticle | null> {
    return this.article({ titles: title, redirects: '1' });
  }

  private async article(selector: Record<string, string>): Promise<WikipediaArticle | null> {
    const data = await this.query({
      ...selector,
      prop: 'coordinates|pageimages|extracts|description|info',
      inprop: 'url',
      exintro: '1',
      explaintext: '1',
      piprop: 'thumbnail',
      pithumbsize: '1200',
    });

    const page = data.query?.pages?.[0];
    if (!page || page.missing) return null;

    const candidate = this.toCandidate(page, { allowAnyTopic: true });
    if (!candidate) return null;

    return {
      candidate,
      description: page.extract?.trim() || null,
      url: page.fullurl ?? null,
    };
  }

  private toCandidate(
    page: WikiPage,
    options: { allowAnyTopic?: boolean } = {},
  ): PlaceCandidate | null {
    const coords = page.coordinates?.[0];
    if (!coords) return null;

    const extract = page.extract?.trim() || null;
    const description = page.description ?? null;
    const classification =
      classifyWikipedia(page.title, description, extract) ??
      (options.allowAnyTopic ? { category: 'hidden' as const, kind: null } : null);
    if (!classification) return null;

    return {
      id: `wiki:${page.pageid}`,
      name: page.title,
      category: classification.category,
      kind: classification.kind,
      lat: coords.lat,
      lon: coords.lon,
      summary: extract ? truncate(extract, SUMMARY_MAX_CHARS) : description,
      imageUrl: page.thumbnail?.source ?? null,
      builtIn: extractBuiltYear(extract),
      isFree: inferIsFreeFromKind(classification.kind),
      source: 'wikipedia',
      wikipediaTitle: page.title,
    };
  }

  private async query(params: Record<string, string>): Promise<WikiQueryResponse> {
    const url = new URL(this.endpoint);
    const search = new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      ...params,
    });
    url.search = search.toString();
    return this.http<WikiQueryResponse>(url);
  }
}
