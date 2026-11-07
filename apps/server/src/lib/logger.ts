type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

/**
 * Logger mínimo en formato JSON (una línea por evento), fácil de procesar
 * por cualquier agregador de logs en producción.
 */
export function createLogger(minLevel: Level): Logger {
  const write = (level: Level, message: string, context?: Record<string, unknown>) => {
    if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[minLevel]) return;
    const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...context });
    if (level === 'error' || level === 'warn') console.error(line);
    else console.log(line);
  };

  return {
    debug: (message, context) => write('debug', message, context),
    info: (message, context) => write('info', message, context),
    warn: (message, context) => write('warn', message, context),
    error: (message, context) => write('error', message, context),
  };
}
