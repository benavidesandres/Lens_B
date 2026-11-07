import { zValidator } from '@hono/zod-validator';
import type { ValidationTargets } from 'hono';
import type { ZodType } from 'zod';

import { AppError } from '../lib/errors';

/**
 * Envoltorio de zValidator que responde con el formato de error común de la API.
 */
export function validate<Target extends keyof ValidationTargets, Schema extends ZodType>(
  target: Target,
  schema: Schema,
) {
  return zValidator(target, schema, (result) => {
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join('.') || target}: ${issue.message}`)
        .join('; ');
      throw new AppError(400, 'VALIDATION_ERROR', message);
    }
  });
}
