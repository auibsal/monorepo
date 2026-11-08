import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["cobertura", "text-summary"],
      reportsDirectory: "./coverage",
      // Floors, two points under the coverage of Nov 8, 2026 (54% of
      // statements and lines, 36% of branches, 40% of functions): a change
      // that drops coverage below them fails CI. Raise them as tests grow.
      thresholds: {
        branches: 34,
        functions: 38,
        lines: 52,
        statements: 52,
      },
    },
    projects: [
      "apps/web",
      "packages/storage",
      "packages/auth",
      "packages/config",
      "packages/sal-data",
      "packages/brand",
      "packages/rbac",
      "packages/internationalization",
      "packages/next-config",
      "packages/telegram",
    ],
  },
});
