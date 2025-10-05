// backend/vitest.config.ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'src/tests/**/*.test.ts'],
    environment: 'node',
    globals: true,
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [tsconfigPaths({ 
    projects: ['./tsconfig.json'], ignoreConfigErrors: true 
  })],
});
