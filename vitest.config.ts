import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['functions/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@cloudflare/workers-types': path.resolve(__dirname, 'node_modules/@cloudflare/workers-types'),
    },
  },
});
