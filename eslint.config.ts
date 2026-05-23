import type { Linter } from 'eslint';

import { baseConfig } from '@auibsal/config/eslint.config';

const config: Linter.Config[] = [
  ...baseConfig,
  {
    // CRITICAL: Stop the root from double-linting the workspaces
    ignores: ['apps/**', 'packages/**'],
  },
];

export default config;
