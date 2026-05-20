import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";
import type { Linter } from "eslint";

// 1. Global Ignores
export const ignoresConfig: Linter.Config = {
  ignores: ["**/.next/**", "**/node_modules/**", "**/dist/**", "**/.turbo/**"],
};

// 2. Base TypeScript Architecture (For root, UI, DB, etc.)
export const baseConfig: Linter.Config[] = [
  ignoresConfig,
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/jsx-key": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "off",
      "no-undef": "off",
    },
  },
];

// 3. Next.js Architecture (For Web & Nexus)
export const nextConfig: Linter.Config[] = [
  ...baseConfig,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];
