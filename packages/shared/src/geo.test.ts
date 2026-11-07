import { describe, expect, it } from 'vitest';

import { distanceMeters, walkingMinutes } from './geo';

describe('distanceMeters', () => {
  it('devuelve 0 para el mismo punto', () => {
    expect(distanceMeters({ lat: 4.6, lon: -74.07 }, { lat: 4.6, lon: -74.07 })).toBe(0);
  });

  it('calcula ~111 km por grado de latitud', () => {
    const d = distanceMeters({ lat: 0, lon: 0 }, { lat: 1, lon: 0 });
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });
});

describe('walkingMinutes', () => {
  it('nunca devuelve menos de 1 minuto', () => {
    expect(walkingMinutes(0)).toBe(1);
  });

  it('aplica el factor de desvío urbano', () => {
    // 800 m * 1,3 / 80 m/min = 13 min
    expect(walkingMinutes(800)).toBe(13);
  });
});
