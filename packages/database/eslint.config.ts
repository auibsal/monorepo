import { baseConfig } from '@auibsal/config/eslint.config';
import type { Linter } from 'eslint';

const config: Linter.Config[] = [
  ...baseConfig,

  // =========================================================================
  // Package-Specific Overrides (Auto-Generated Code Protection)
  // =========================================================================
  // The Supabase CLI generates raw Postgres mappings that will inherently
  // violate strict TypeScript linting rules. We disable them locally here.
  {
    files: ['**/database.types.ts', '**/supabase.ts', '**/types.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
];

export default config;
