import type { Linter } from 'eslint';

import { nextConfig } from '@auibsal/config/eslint.config';

const config: Linter.Config[] = [
  ...nextConfig,
  {
    // Local Nexus overrides
    ignores: ['.next/**', 'node_modules/**'],
    rules: {
      'no-console': 'warn',
    },
  },
];

export default config;
