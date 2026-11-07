import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { CATEGORY_LABELS, type Coordinates, type Place } from '@lens/shared';
import { z } from 'zod';

import type { Logger } from '../../lib/logger';
import { fitToBudget, type PickedStop } from './assemble';

// Respuesta estructurada que se le pide al modelo.
const AiRouteSchema = z.object({
  title: z.string().describe('Título breve de la ruta, en español, sin emojis.'),
  summary: z.string().describe('Una o dos frases que expliquen por qué la ruta encaja.'),
  timeBudgetMinutes: z
    .number()
    .int()
    .describe('Minutos totales disponibles según la petición; 60 si no se menciona.'),
  stops: z.array(
    z.object({
      placeId: z.string().describe('Id exacto de un lugar de la lista de candidatos.'),
      stayMinutes: z.number().int().describe('Minutos sugeridos de permanencia.'),
      note: z.string().describe('Una frase concreta sobre qué ver o por qué ir.'),
    }),
  ),
});

// El prompt de sistema es estable para aprovechar la caché de prompts.
const SYSTEM_PROMPT = `Eres el planificador de rutas a pie de LENS, una app que ayuda a descubrir lugares interesantes cerca del usuario.

Recibirás la petición del usuario y una lista de lugares candidatos reales (con id, tipo, distancia desde el usuario, coordenadas y si la entrada es gratuita).

Reglas:
- Usa solo lugares de la lista, citándolos por su id exacto. No inventes lugares ni datos.
- Ordena las paradas para formar un recorrido a pie lógico, sin idas y vueltas: considera las coordenadas.
- Respeta el tiempo disponible: la suma de tramos a pie (unos 60 metros por minuto en ciudad) y los tiempos de visita no debe superarlo.
- Si la persona no quiere gastar dinero, usa solo lugares marcados como gratuitos.
- Prefiere variedad y lugares con historia o algo concreto que contar.
- Entre 2 y 6 paradas.
- Escribe en español neutro, con tono sobrio e informativo. Sin emojis ni signos de exclamación.
- Las notas deben basarse en la información proporcionada del lugar; si hay poca, describe lo que se puede observar según su tipo.`;

const MAX_CANDIDATES = 40;

export interface AiRouteResult {
  title: string;
  summary: string;
  stops: PickedStop[];
}

export class AiRouteComposer {
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly model: string,
    private readonly effort: 'low' | 'medium' | 'high',
    private readonly logger: Logger,
  ) {
    this.client = new Anthropic({ apiKey, timeout: 45_000, maxRetries: 1 });
  }

  /**
   * Pide al modelo que componga la ruta. Devuelve null si la respuesta no es
   * utilizable (rechazo, formato inválido o ids desconocidos), para que el
   * llamador recurra al planificador local.
   */
  async compose(
    origin: Coordinates,
    prompt: string,
    candidates: Place[],
  ): Promise<AiRouteResult | null> {
    const pool = candidates.slice(0, MAX_CANDIDATES);
    const byId = new Map(pool.map((place) => [place.id, place]));

    const response = await this.client.beta.messages.parse({
      model: this.model,
      max_tokens: 4000,
      // Si el modelo declina por política, el servidor reintenta con el modelo de respaldo recomendado.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(origin, prompt, pool) }],
      output_config: {
        effort: this.effort,
        format: betaZodOutputFormat(AiRouteSchema),
      },
    });

    if (response.stop_reason === 'refusal') {
      this.logger.warn('El modelo declinó la petición de ruta', {
        stopReason: response.stop_reason,
      });
      return null;
    }
    if (response.stop_reason === 'max_tokens') {
      this.logger.warn('Respuesta de ruta truncada por max_tokens');
      return null;
    }

    const parsed = response.parsed_output;
    if (!parsed) {
      this.logger.warn('No se pudo interpretar la respuesta del modelo');
      return null;
    }

    const seen = new Set<string>();
    const stops: PickedStop[] = parsed.stops.flatMap((stop) => {
      const place = byId.get(stop.placeId);
      // Se descartan ids inventados o repetidos.
      if (!place || seen.has(place.id)) return [];
      seen.add(place.id);
      const stayMinutes = Math.min(90, Math.max(3, stop.stayMinutes));
      return [{ place, stayMinutes, note: stop.note.trim() }];
    });

    const budget = Math.min(240, Math.max(15, parsed.timeBudgetMinutes));
    const fitted = fitToBudget(origin, stops, budget);
    if (fitted.length === 0) return null;

    return { title: parsed.title.trim(), summary: parsed.summary.trim(), stops: fitted };
  }
}

function buildUserMessage(origin: Coordinates, prompt: string, places: Place[]): string {
  const lines = places.map((place) =>
    [
      `- id: ${place.id}`,
      `  nombre: ${place.name}`,
      `  tipo: ${place.kind ?? CATEGORY_LABELS[place.category]} (${CATEGORY_LABELS[place.category]})`,
      `  distancia: ${place.distanceMeters} m`,
      `  coordenadas: ${place.lat.toFixed(5)}, ${place.lon.toFixed(5)}`,
      `  gratuito: ${place.isFree === null ? 'desconocido' : place.isFree ? 'sí' : 'no'}`,
      place.builtIn ? `  año: ${place.builtIn}` : null,
      place.summary ? `  información: ${place.summary}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
  );

  return `<peticion_usuario>
${prompt}
</peticion_usuario>

<ubicacion_usuario>${origin.lat.toFixed(5)}, ${origin.lon.toFixed(5)}</ubicacion_usuario>

<candidatos>
${lines.join('\n')}
</candidatos>`;
}
