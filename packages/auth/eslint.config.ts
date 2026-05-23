import { baseConfig } from '@auibsal/config/eslint.config';
import type { Linter } from 'eslint';

const config: Linter.Config[] = [
  ...baseConfig,
  
  // =========================================================================
  // Package-Specific Overrides
  // =========================================================================
  // If you introduce client-side hooks (e.g., useAuth) or context providers, 
  // you can safely append local rules or plugins directly here.
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // Local rule adjustments can go here without polluting the global config
    },
  },
];

export default config;
