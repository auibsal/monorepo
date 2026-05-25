import type { Linter } from 'eslint';

import { nextConfig } from '@auibsal/config/eslint.config';

const config: Linter.Config[] = [
  ...nextConfig,

  // =========================================================================
  // App-Specific Overrides (Web Platform)
  // =========================================================================
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // If you find Next.js complaining about apostrophes in your English copy
      // or specific Arabic characters, you can safely relax the entity rule here:
      // 'react/no-unescaped-entities': 'off',
    },
  },
];

export default config;
