import type { Linter } from 'eslint';

import { nextConfig } from '@auibsal/config/eslint.config';

const config: Linter.Config[] = [
  ...nextConfig,

  // =========================================================================
  // Package-Specific Overrides (UI Library)
  // =========================================================================
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // TypeScript natively handles our prop types, so we can safely disable the React runtime check
      'react/prop-types': 'off',

      // If you ever need to locally adjust rules for heavy component composition, do it here.
    },
  },
];

export default config;
