import type { ApiError } from '@lens/shared';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { requestId } from 'hono/request-id';
import { secureHeaders } from 'hono/secure-headers';

import type { Env } from './config/env';
import { placesRoutes } from './http/routes/places';
import { routePlanRoutes } from './http/routes/route-plans';
import { AppError } from './lib/errors';
import { createHttpClient } from './lib/http';
import type { Logger } from './lib/logger';
import { OverpassProvider } from './providers/overpass';
import { WikipediaProvider } from './providers/wikipedia';
import { PlacesService } from './services/places-service';
import { AiRouteComposer } from './services/route-planner/ai';
import { RoutePlanner } from './services/route-planner/route-planner';

export interface AppDependencies {
  places: PlacesService;
  planner: RoutePlanner;
}

/** Construye las dependencias reales a partir de la configuración. */
export function createDependencies(env: Env, logger: Logger): AppDependencies {
  const wikipedia = new WikipediaProvider(
    createHttpClient('Wikipedia', { userAgent: env.HTTP_USER_AGENT }),
    env.WIKIPEDIA_LANG,
  );
  const overpass = new OverpassProvider(
    createHttpClient('OpenStreetMap', { userAgent: env.HTTP_USER_AGENT, timeoutMs: 12_000 }),
    env.OVERPASS_URLS,
  );
  const places = new PlacesService(wikipedia, overpass, logger);
  const ai = env.ANTHROPIC_API_KEY
    ? new AiRouteComposer(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL, env.ANTHROPIC_EFFORT, logger)
    : null;

  return { places, planner: new RoutePlanner(places, ai, logger) };
}

/**
 * Crea la aplicación HTTP. Recibe las dependencias ya construidas para que
 * los tests puedan inyectar dobles sin tocar la red.
 */
export function createApp(deps: AppDependencies, options: { corsOrigin: string; logger: Logger }) {
  const { logger } = options;
  const origins = options.corsOrigin.split(',').map((origin) => origin.trim());

  const app = new Hono();

  app.use('*', requestId());
  app.use('*', secureHeaders());
  app.use('*', cors({ origin: origins.includes('*') ? '*' : origins }));
  app.use('*', bodyLimit({ maxSize: 16 * 1024 }));
  app.use('*', async (c, next) => {
    const started = performance.now();
    await next();
    logger.info('request', {
      id: c.get('requestId'),
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      ms: Math.round(performance.now() - started),
    });
  });

  app.get('/health', (c) => c.json({ status: 'ok', ai: deps.planner.aiEnabled }));

  app.route('/v1/places', placesRoutes(deps.places));
  app.route('/v1/route-plans', routePlanRoutes(deps.planner));

  app.notFound((c) =>
    c.json<ApiError>({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada.' } }, 404),
  );

  app.onError((error, c) => {
    if (error instanceof AppError) {
      if (error.status >= 500) {
        logger.error(error.message, { id: c.get('requestId'), cause: String(error.cause) });
      }
      return c.json<ApiError>(
        { error: { code: error.code, message: error.message } },
        error.status,
      );
    }
    // Los errores inesperados se registran completos pero no se exponen al cliente.
    logger.error('Error no controlado', {
      id: c.get('requestId'),
      error: error.message,
      stack: error.stack,
    });
    return c.json<ApiError>(
      { error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado.' } },
      500,
    );
  });

  return app;
}
