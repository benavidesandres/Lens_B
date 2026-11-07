import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  clean: true,
  sourcemap: true,
  // El paquete compartido se distribuye como TypeScript, así que se incluye en el bundle.
  noExternal: ['@lens/shared'],
});
