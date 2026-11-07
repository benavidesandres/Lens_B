import { RoutePlanRequestSchema } from '@lens/shared';
import { Hono } from 'hono';

import type { RoutePlanner } from '../../services/route-planner/route-planner';
import { rateLimit } from '../middleware/rate-limit';
import { validate } from '../validation';

export function routePlanRoutes(planner: RoutePlanner) {
  return new Hono().post(
    '/',
    // 5 rutas seguidas como máximo y luego una cada 15 segundos por IP.
    rateLimit({ capacity: 5, refillPerMinute: 4 }),
    validate('json', RoutePlanRequestSchema),
    async (c) => c.json(await planner.plan(c.req.valid('json'))),
  );
}
