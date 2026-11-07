interface Entry<V> {
  value: V;
  expiresAt: number;
}

/**
 * Caché en memoria con expiración y desalojo LRU. Reduce la carga sobre
 * Overpass y Wikipedia, que tienen límites de uso estrictos.
 */
export class TtlCache<V> {
  private readonly entries = new Map<string, Entry<V>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 500,
  ) {}

  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    // Reinsertar mueve la clave al final: así el Map conserva el orden LRU.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: V, ttlMs = this.ttlMs): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: Date.now() + ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  /**
   * Devuelve el valor cacheado o lo calcula. Las peticiones simultáneas con
   * la misma clave comparten una sola llamada al servicio externo.
   */
  private readonly inflight = new Map<string, Promise<V>>();

  async getOrLoad(
    key: string,
    load: () => Promise<V>,
    // Permite elegir la duración según el resultado (p. ej. menos tiempo si es parcial).
    ttlFor?: (value: V) => number,
  ): Promise<V> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    const pending = this.inflight.get(key);
    if (pending) return pending;

    const promise = load()
      .then((value) => {
        this.set(key, value, ttlFor?.(value));
        return value;
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, promise);
    return promise;
  }
}
