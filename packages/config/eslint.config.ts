import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import globals from "globals";
import type { Linter } from "eslint";

// 1. Global Ignores
export const ignoresConfig: Linter.Config = {
  ignores: [
    "**/.next/**",
    "**/node_modules/**",
    "**/dist/**",
    "**/.turbo/**",
    "**/.vercel/**"
  ],
};

// 2. Base TypeScript Architecture (For root, packages/ui, packages/database)
export const baseConfig: Linter.Config[] = tseslint.config(
  ignoresConfig,
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "off",
      "no-undef": "off", // Automatically handled by TypeScript
    },
  }
) as Linter.Config[];

// 3. Next.js & React Architecture (For apps/web, apps/nexus)
export const nextConfig: Linter.Config[] = [
  ...baseConfig,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": hooksPlugin,
      "@next/next": nextPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // React & Hooks Rules
      ...reactPlugin.configs.recommended.rules,
      ...hooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off", // Not needed in Next.js
      "react/prop-types": "off",         // We use TypeScript for this

      // Next.js Rules
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];
