import { defineConfig } from 'vitest/config';

/**
 * The universal Vitest configuration matrix.
 * Any package or app in the monorepo that needs testing will extend this baseline.
 */
export const sharedVitestConfig = defineConfig({
  test: {
    globals: true,
    environment: 'node', // Default to node, UI packages will override this to 'jsdom'
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
