import {
  walkingMinutes,
  type Coordinates,
  type RoutePlan,
  type RoutePlanRequest,
} from '@lens/shared';

import type { GoogleRoutesProvider } from '../../providers/google-routes';

import type { Logger } from '../../lib/logger';
import type { PlacesService } from '../places-service';
import type { RouteComposer } from './ai';
import { assembleRoute } from './assemble';
import { planHeuristic } from './heuristic';
import { parseIntent } from './intent';

/** A pie, en la mayoría de rutas no tiene sentido buscar más lejos de esto. */
function searchRadiusFor(minutes: number): number {
  return Math.min(3000, Math.max(800, minutes * 25));
}

export class RoutePlanner {
  constructor(
    private readonly places: PlacesService,
    private readonly ai: RouteComposer | null,
    private readonly logger: Logger,
    // Opcional: trazado real por calles. Sin él se usan distancias en línea recta.
    private readonly routes: GoogleRoutesProvider | null = null,
  ) {}

  get aiEnabled(): boolean {
    return this.ai !== null;
  }

  async plan(request: RoutePlanRequest): Promise<RoutePlan> {
    const origin = { lat: request.lat, lon: request.lon };
    return this.withWalkingPath(origin, await this.compose(request));
  }

  private async compose(request: RoutePlanRequest): Promise<RoutePlan> {
    const origin = { lat: request.lat, lon: request.lon };
    const intent = parseIntent(request.prompt);
    const candidates = await this.places.nearby({
      ...origin,
      radius: searchRadiusFor(intent.minutes),
    });

    if (this.ai && candidates.length > 0) {
      try {
        const composed = await this.ai.compose(origin, request.prompt, candidates);
        if (composed) {
          return assembleRoute(origin, composed.stops, {
            title: composed.title,
            summary: composed.summary,
            engine: 'ai',
          });
        }
      } catch (error) {
        // Cualquier fallo de la IA degrada al planificador local: el usuario siempre recibe una ruta.
        this.logger.warn('Fallo al componer la ruta con IA; se usa el planificador local', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const heuristic = planHeuristic(origin, candidates, intent);
    return assembleRoute(origin, heuristic.stops, {
      title: heuristic.title,
      summary: heuristic.summary,
      engine: 'heuristic',
    });
  }

  /**
   * Sustituye las distancias en línea recta por las reales a pie y añade el
   * trazado. Si Google falla, la ruta se entrega igual con la estimación.
   */
  private async withWalkingPath(origin: Coordinates, plan: RoutePlan): Promise<RoutePlan> {
    if (!this.routes || plan.stops.length === 0) return plan;
    try {
      const walking = await this.routes.walking(
        origin,
        plan.stops.map((stop) => stop.place),
      );
      if (!walking) return plan;

      const stops = plan.stops.map((stop, index) => {
        const leg = walking.legs[index]!;
        return {
          ...stop,
          legMeters: Math.round(leg.meters),
          // Se usa el tiempo de Google; si no lo trae, se estima por la distancia.
          legMinutes: leg.seconds > 0 ? Math.round(leg.seconds / 60) : walkingMinutes(leg.meters),
        };
      });
      return {
        ...plan,
        stops,
        totalMeters: stops.reduce((sum, stop) => sum + stop.legMeters, 0),
        totalMinutes: stops.reduce((sum, stop) => sum + stop.legMinutes + stop.stayMinutes, 0),
        path: walking.path,
      };
    } catch (error) {
      this.logger.warn('No se pudo calcular el trazado a pie con Google Routes', {
        error: error instanceof Error ? error.message : String(error),
      });
      return plan;
    }
  }
}
