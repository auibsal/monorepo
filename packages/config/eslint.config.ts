import type { Linter } from 'eslint';
import tseslint from 'typescript-eslint';

const config: Linter.Config[] = [
  {
    // Globally ignore build outputs and cache directories
    ignores: ['.next/**', 'node_modules/**', 'dist/**', '.turbo/**'],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Define your shared architectural linting rules here
      'react/jsx-key': 'off',
      '@next/next/no-html-link-for-pages': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off'
    },
  },
];

export default config;
