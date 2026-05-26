import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import type { Linter } from 'eslint';
import reactPlugin from 'eslint-plugin-react';
import hooksPlugin from 'eslint-plugin-react-hooks';
import turboPlugin from 'eslint-plugin-turbo';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// 1. Global Ignores
export const ignoresConfig: Linter.Config = {
  ignores: [
    '**/.next/**',
    '**/node_modules/**',
    '**/dist/**',
    '**/.turbo/**',
    '**/.vercel/**',
    '**/supabase/.temp/**',
  ],
};

// 2. Base TypeScript Architecture (For root, packages/ui, packages/database, packages/config)
export const baseConfig: Linter.Config[] = tseslint.config(
  ignoresConfig,
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      turbo: turboPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // 🚨 Turborepo cache protection
      'turbo/no-undeclared-env-vars': 'error',

      // 🧹 TypeScript cleanliness & bundle optimization
      '@typescript-eslint/consistent-type-imports': [
        'off',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-undef': 'off', // Automatically handled by TypeScript
    },
  },
) as Linter.Config[];

// 3. Next.js & React Architecture (For apps/web, apps/nexus)
export const nextConfig: Linter.Config[] = [
  ...baseConfig,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': hooksPlugin,
      '@next/next': nextPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: {
        version: '19.0.0',
      },
    },
    rules: {
      // React & Hooks Rules
      ...reactPlugin.configs.recommended.rules,
      ...hooksPlugin.configs.recommended.rules,

      'react-hooks/purity': 'off',

      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/rules-of-hooks': 'off',
      'react/no-unescaped-entities': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',

      'react/react-in-jsx-scope': 'off', // Not needed in Next.js
      'react/prop-types': 'off', // We use TypeScript for this

      // Next.js Rules
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      '@next/next/no-html-link-for-pages': 'off',
    },
  } as any,
];
