import type { RoutePlan, RoutePlanRequest } from '@lens/shared';

import type { Logger } from '../../lib/logger';
import type { PlacesService } from '../places-service';
import type { AiRouteComposer } from './ai';
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
    private readonly ai: AiRouteComposer | null,
    private readonly logger: Logger,
  ) {}

  get aiEnabled(): boolean {
    return this.ai !== null;
  }

  async plan(request: RoutePlanRequest): Promise<RoutePlan> {
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
}
