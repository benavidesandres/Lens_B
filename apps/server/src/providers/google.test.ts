import { describe, expect, it } from 'vitest';

import { classifyWikipedia } from './classify';
import { GOOGLE_PHOTO_PREFIX, toCandidate, type GooglePlace } from './google-places';
import { decodePolyline } from './google-routes';

const base: GooglePlace = {
  id: 'ChIJabc123',
  displayName: { text: 'Café La Catedral' },
  primaryType: 'cafe',
  primaryTypeDisplayName: { text: 'Cafetería' },
  location: { latitude: 1.2136, longitude: -77.2811 },
  businessStatus: 'OPERATIONAL',
};

describe('toCandidate (Google Places)', () => {
  it('convierte precio, calificación, horario y foto', () => {
    const candidate = toCandidate({
      ...base,
      rating: 4.6,
      userRatingCount: 320,
      priceLevel: 'PRICE_LEVEL_INEXPENSIVE',
      priceRange: {
        startPrice: { currencyCode: 'COP', units: '10000' },
        endPrice: { currencyCode: 'COP', units: '20000' },
      },
      currentOpeningHours: { openNow: true },
      photos: [{ name: 'places/ChIJabc123/photos/XYZ' }],
    });

    expect(candidate).toMatchObject({
      id: 'google:ChIJabc123',
      category: 'food',
      kind: 'Cafetería',
      rating: 4.6,
      ratingCount: 320,
      priceLevel: 1,
      priceRange: { min: 10000, max: 20000, currency: 'COP' },
      openNow: true,
      isFree: false,
      source: 'google',
      imageUrl: `${GOOGLE_PHOTO_PREFIX}places/ChIJabc123/photos/XYZ`,
    });
  });

  it('marca como gratuitos los parques sin nivel de precio', () => {
    const candidate = toCandidate({ ...base, primaryType: 'park' });
    expect(candidate?.category).toBe('nature');
    expect(candidate?.isFree).toBe(true);
    expect(candidate?.priceLevel).toBeNull();
  });

  it('descarta negocios cerrados definitivamente', () => {
    expect(toCandidate({ ...base, businessStatus: 'CLOSED_PERMANENTLY' })).toBeNull();
  });

  it('usa los tipos secundarios si el principal no es conocido', () => {
    const candidate = toCandidate({ ...base, primaryType: 'point_of_interest', types: ['museum'] });
    expect(candidate?.category).toBe('history');
  });
});

describe('decodePolyline', () => {
  it('decodifica el ejemplo de la documentación de Google', () => {
    expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual([
      { lat: 38.5, lon: -120.2 },
      { lat: 40.7, lon: -120.95 },
      { lat: 43.252, lon: -126.453 },
    ]);
  });
});

describe('classifyWikipedia', () => {
  it('excluye artículos de ciudades y entes territoriales', () => {
    expect(
      classifyWikipedia('Pasto (Colombia)', 'ciudad y capital del departamento de Nariño', null),
    ).toBeNull();
    expect(
      classifyWikipedia('Provincia de Pasto', 'antiguo ente territorial de Nueva Granada', null),
    ).toBeNull();
  });

  it('mantiene lugares cuya descripción menciona la ciudad', () => {
    expect(
      classifyWikipedia(
        'Plaza de Nariño (Pasto)',
        'punto de referencia central en la ciudad',
        null,
      ),
    ).toMatchObject({ kind: 'Plaza' });
  });
});
