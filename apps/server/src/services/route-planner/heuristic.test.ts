import type { Place } from '@lens/shared';
import { describe, expect, it } from 'vitest';

import { assembleRoute } from './assemble';
import { planHeuristic } from './heuristic';

const origin = { lat: 4.6, lon: -74.07 };

function place(overrides: Partial<Place> & Pick<Place, 'id'>): Place {
  return {
    name: overrides.id,
    category: 'art',
    kind: 'Mural',
    lat: origin.lat,
    lon: origin.lon,
    distanceMeters: 0,
    walkMinutes: 0,
    summary: null,
    imageUrl: null,
    builtIn: null,
    isFree: true,
    source: 'osm',
    ...overrides,
  };
}

describe('planHeuristic', () => {
  it('respeta el presupuesto de tiempo', () => {
    // Lugares cada ~300 m hacia el norte.
    const places = Array.from({ length: 10 }, (_, i) =>
      place({ id: `p${i}`, lat: origin.lat + 0.0027 * (i + 1), kind: `Tipo ${i}` }),
    );
    const { stops } = planHeuristic(origin, places, {
      minutes: 30,
      freeOnly: false,
      categories: [],
    });
    const route = assembleRoute(origin, stops, { title: 't', summary: 's', engine: 'heuristic' });

    expect(stops.length).toBeGreaterThan(0);
    expect(route.totalMinutes).toBeLessThanOrEqual(30);
  });

  it('excluye lugares de pago cuando se pide una ruta gratuita', () => {
    const places = [
      place({ id: 'pago', category: 'food', kind: 'Café', isFree: false }),
      place({ id: 'gratis', lat: origin.lat + 0.001 }),
    ];
    const { stops } = planHeuristic(origin, places, {
      minutes: 60,
      freeOnly: true,
      categories: [],
    });
    expect(stops.map((stop) => stop.place.id)).toEqual(['gratis']);
  });

  it('prioriza la categoría pedida', () => {
    const places = [
      place({ id: 'parque', category: 'nature', kind: 'Parque' }),
      place({ id: 'museo', category: 'history', kind: 'Museo', lat: origin.lat + 0.001 }),
      place({ id: 'iglesia', category: 'history', kind: 'Iglesia', lat: origin.lat + 0.002 }),
    ];
    const { stops, title } = planHeuristic(origin, places, {
      minutes: 120,
      freeOnly: false,
      categories: ['history'],
    });
    expect(stops.every((stop) => stop.place.category === 'history')).toBe(true);
    expect(title).toBe('Ruta histórica');
  });
});
