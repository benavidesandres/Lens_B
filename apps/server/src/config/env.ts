import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(8787),
  HOST: z.string().default('0.0.0.0'),
  // Vacío se interpreta como "sin IA".
  ANTHROPIC_API_KEY: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  ANTHROPIC_MODEL: z.string().default('claude-opus-5-5'),
  ANTHROPIC_EFFORT: z.enum(['low', 'medium', 'high']).default('low'),
  WIKIPEDIA_LANG: z
    .string()
    .regex(/^[a-z]{2,3}$/)
    .default('es'),
  // Lista separada por comas, en orden de preferencia.
  OVERPASS_URLS: z
    .string()
    .default(
      'https://overpass-api.de/api/interpreter,https://overpass.private.coffee/api/interpreter',
    )
    .transform((value) =>
      value
        .split(',')
        .map((url) => url.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.url()).min(1)),
  HTTP_USER_AGENT: z.string().min(3).default('LENS/0.1 (+https://github.com/your-org/lens)'),
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * Valida las variables de entorno al arrancar. Si algo está mal configurado
 * el proceso falla de inmediato con un mensaje claro, en vez de fallar más tarde.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuración de entorno inválida:\n${details}`);
  }
  return parsed.data;
}
