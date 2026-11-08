import { describe, expect, it } from 'vitest';

import type { PlaceCandidate } from '../providers/types';
import { mergeCandidates } from './places-service';

function candidate(overrides: Partial<PlaceCandidate> & Pick<PlaceCandidate, 'id' | 'name'>) {
  return {
    category: 'history',
    kind: 'Teatro',
    lat: 4.6,
    lon: -74.07,
    summary: null,
    imageUrl: null,
    builtIn: null,
    isFree: null,
    rating: null,
    ratingCount: null,
    priceLevel: null,
    priceRange: null,
    openNow: null,
    source: 'osm',
    wikipediaTitle: null,
    ...overrides,
  } satisfies PlaceCandidate;
}

describe('mergeCandidates', () => {
  it('fusiona OSM con su artículo de Wikipedia por la etiqueta wikipedia', () => {
    const osm = [
      candidate({ id: 'osm:way:1', name: 'Teatro Colón', wikipediaTitle: 'Teatro Colón (Bogotá)' }),
    ];
    const wiki = [
      candidate({
        id: 'wiki:9',
        name: 'Teatro Colón (Bogotá)',
        source: 'wikipedia',
        summary: 'Teatro inaugurado en 1892.',
        imageUrl: 'https://upload.wikimedia.org/x.jpg',
        builtIn: '1892',
        wikipediaTitle: 'Teatro Colón (Bogotá)',
      }),
    ];

    const [merged, ...rest] = mergeCandidates(osm, wiki);
    expect(rest).toHaveLength(0);
    expect(merged).toMatchObject({
      id: 'osm:way:1',
      summary: 'Teatro inaugurado en 1892.',
      builtIn: '1892',
      imageUrl: 'https://upload.wikimedia.org/x.jpg',
    });
  });

  it('no fusiona obras sin nombre aunque estén juntas', () => {
    const osm = [
      candidate({ id: 'osm:node:1', name: 'Mural', kind: 'Mural', category: 'art' }),
      candidate({ id: 'osm:node:2', name: 'Mural', kind: 'Mural', category: 'art', lat: 4.6001 }),
    ];
    expect(mergeCandidates(osm, [])).toHaveLength(2);
  });

  it('elimina duplicados con el mismo nombre muy próximos', () => {
    const osm = [
      candidate({ id: 'osm:node:1', name: 'Parque Central', kind: 'Parque' }),
      candidate({ id: 'osm:way:2', name: 'Parque Central', kind: 'Parque', lat: 4.6004 }),
    ];
    expect(mergeCandidates(osm, [])).toHaveLength(1);
  });
});
