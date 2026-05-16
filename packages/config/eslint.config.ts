import type { Linter } from 'eslint';

const config: Linter.Config[] = [
  {
    // Globally ignore build outputs and cache directories
    ignores: ['.next/**', 'node_modules/**', 'dist/**', '.turbo/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Define your shared architectural linting rules here
      'react/jsx-key': 'off',
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
];

export default config;
