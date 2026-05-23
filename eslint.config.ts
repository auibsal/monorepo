import type { Linter } from 'eslint';

import { baseConfig } from '@auibsal/config/eslint.config';

const config: Linter.Config[] = [
  {
    // CRITICAL: Global ignores must be an object with ONLY the 'ignores' key
    // Placed at the top of the array, this immediately drops these paths from the ESLint pipeline
    ignores: [
      'apps/**',
      'packages/**',
      '.turbo/**',
      'node_modules/**',
      'dist/**',
      'coverage/**',
    ],
  },
  ...baseConfig,
];

export default config;
