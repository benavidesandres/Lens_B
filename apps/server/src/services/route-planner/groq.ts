import type { Coordinates, Place } from '@lens/shared';
import { z } from 'zod';

import type { Logger } from '../../lib/logger';
import {
  AiRouteSchema,
  buildUserMessage,
  finalizeRoute,
  MAX_CANDIDATES,
  SYSTEM_PROMPT,
  type AiRouteResult,
  type RouteComposer,
} from './ai';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// JSON Schema estricto para que el modelo devuelva exactamente la forma esperada.
const RESPONSE_SCHEMA = z.toJSONSchema(AiRouteSchema, { target: 'draft-7' });

interface ChatCompletion {
  choices?: { finish_reason?: string; message?: { content?: string | null } }[];
}

/**
 * Compone rutas con un modelo alojado en Groq (API compatible con OpenAI).
 * Usa el mismo prompt y las mismas validaciones que el compositor de Claude.
 */
export class GroqRouteComposer implements RouteComposer {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly logger: Logger,
  ) {}

  async compose(
    origin: Coordinates,
    prompt: string,
    candidates: Place[],
  ): Promise<AiRouteResult | null> {
    const pool = candidates.slice(0, MAX_CANDIDATES);
    const byId = new Map(pool.map((place) => [place.id, place]));

    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        max_completion_tokens: 4000,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserMessage(origin, prompt, pool) },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'ruta', strict: true, schema: RESPONSE_SCHEMA },
        },
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      throw new Error(`Groq respondió HTTP ${response.status}: ${detail}`);
    }

    const data = (await response.json()) as ChatCompletion;
    const choice = data.choices?.[0];
    if (choice?.finish_reason === 'length') {
      this.logger.warn('Respuesta de ruta truncada por longitud (Groq)');
      return null;
    }

    let json: unknown;
    try {
      json = JSON.parse(choice?.message?.content ?? '');
    } catch {
      this.logger.warn('Groq devolvió una respuesta que no es JSON');
      return null;
    }

    const parsed = AiRouteSchema.safeParse(json);
    if (!parsed.success) {
      this.logger.warn('La respuesta de Groq no cumple el esquema', {
        issues: parsed.error.issues.length,
      });
      return null;
    }

    return finalizeRoute(origin, parsed.data, byId);
  }
}
