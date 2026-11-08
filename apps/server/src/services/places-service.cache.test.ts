import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlacesService } from './places-service';

const query = { lat: 4.6, lon: -74.07, radius: 1200 };

function serviceWith(overpassNearby: () => Promise<never[]>) {
  const google = { nearby: vi.fn(async () => []) };
  const service = new PlacesService(
    { nearby: async () => [] } as never,
    { nearby: overpassNearby } as never,
    { warn: () => undefined, error: () => undefined } as never,
    google as never,
  );
  return { service, google };
}

describe('PlacesService: cuota de Google', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('no repite la búsqueda en Google cuando se reintenta por un fallo de otra fuente', async () => {
    vi.useFakeTimers();
    const overpass = vi.fn(async () => {
      throw new Error('Overpass saturado');
    });
    const { service, google } = serviceWith(overpass);

    await service.nearby(query);
    // El resultado parcial caduca a los 60 s y la siguiente petición vuelve a las fuentes.
    await vi.advanceTimersByTimeAsync(61_000);
    await service.nearby(query);

    expect(overpass).toHaveBeenCalledTimes(2);
    expect(google.nearby).toHaveBeenCalledTimes(1);
  });
});
