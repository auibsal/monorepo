import { mergeConfig, defineConfig } from 'vitest/config';
import { sharedVitestConfig } from '@auibsal/testing/vitest';

export default mergeConfig(
  sharedVitestConfig,
  defineConfig({
    test: {
      // 🚨 OVERRIDE: Boot the virtual browser instead of Node
      environment: 'jsdom', 
      // 🚨 OVERRIDE: Inject the visual testing vocabulary
      setupFiles: ['./vitest.setup.ts'], 
    },
  })
);
