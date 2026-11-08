import type { Coordinates } from '@lens/shared';

import { UpstreamError } from '../lib/errors';

const ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const TIMEOUT_MS = 10_000;
// Routes API admite hasta 25 puntos intermedios.
const MAX_INTERMEDIATES = 25;

export interface WalkingLeg {
  meters: number;
  seconds: number;
}

export interface WalkingRoute {
  legs: WalkingLeg[];
  path: Coordinates[];
}

interface ComputeRoutesResponse {
  routes?: {
    polyline?: { encodedPolyline?: string };
    legs?: { distanceMeters?: number; duration?: string }[];
  }[];
}

/** Cliente de Routes API: trazado real a pie por calles, con distancia y tiempo por tramo. */
export class GoogleRoutesProvider {
  constructor(
    private readonly apiKey: string,
    private readonly language: string,
  ) {}

  /** Devuelve null si Google no encuentra ruta a pie entre los puntos. */
  async walking(origin: Coordinates, stops: Coordinates[]): Promise<WalkingRoute | null> {
    if (stops.length === 0 || stops.length > MAX_INTERMEDIATES + 1) return null;
    const waypoint = (point: Coordinates) => ({
      location: { latLng: { latitude: point.lat, longitude: point.lon } },
    });

    let response: Response;
    try {
      response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask':
            'routes.polyline.encodedPolyline,routes.legs.distanceMeters,routes.legs.duration',
        },
        body: JSON.stringify({
          origin: waypoint(origin),
          destination: waypoint(stops[stops.length - 1]!),
          intermediates: stops.slice(0, -1).map(waypoint),
          travelMode: 'WALK',
          languageCode: this.language,
          units: 'METRIC',
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (cause) {
      throw new UpstreamError('Google Routes', cause);
    }
    if (!response.ok) {
      throw new UpstreamError('Google Routes', new Error(`HTTP ${response.status}`));
    }

    const data = (await response.json()) as ComputeRoutesResponse;
    const route = data.routes?.[0];
    const encoded = route?.polyline?.encodedPolyline;
    if (!route?.legs || route.legs.length !== stops.length || !encoded) return null;

    return {
      legs: route.legs.map((leg) => ({
        meters: leg.distanceMeters ?? 0,
        seconds: parseDuration(leg.duration),
      })),
      path: decodePolyline(encoded),
    };
  }
}

/** "123s" → 123. */
function parseDuration(value: string | undefined): number {
  const seconds = value ? Number.parseFloat(value) : Number.NaN;
  return Number.isFinite(seconds) ? seconds : 0;
}

/**
 * Decodifica el formato "encoded polyline" de Google.
 * https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
export function decodePolyline(encoded: string): Coordinates[] {
  const points: Coordinates[] = [];
  let index = 0;
  let lat = 0;
  let lon = 0;

  const next = () => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };

  while (index < encoded.length) {
    lat += next();
    lon += next();
    points.push({ lat: lat / 1e5, lon: lon / 1e5 });
  }
  return points;
}
