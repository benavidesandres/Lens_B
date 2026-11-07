import { serve } from '@hono/node-server';

import { createApp, createDependencies } from './app';
import { loadEnv } from './config/env';
import { createLogger } from './lib/logger';

const env = loadEnv();
const logger = createLogger(env.LOG_LEVEL);

const app = createApp(createDependencies(env, logger), { corsOrigin: env.CORS_ORIGIN, logger });

const server = serve({ fetch: app.fetch, port: env.PORT, hostname: env.HOST }, (info) => {
  logger.info('Servidor LENS iniciado', {
    url: `http://${info.address}:${info.port}`,
    ai: Boolean(env.ANTHROPIC_API_KEY),
  });
});

// Cierre ordenado: deja terminar las peticiones en curso antes de salir.
const shutdown = (signal: string) => {
  logger.info('Cerrando servidor', { signal });
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
