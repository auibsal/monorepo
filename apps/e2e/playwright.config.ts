import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end journeys against a local Supabase stack and the one app in dev
 * mode (CI: .github/workflows/ci.yml, job "End-to-end"). Locally:
 * `bun run db:start`, then `bun run --cwd apps/e2e e2e` (the server is
 * started here unless already running). E2E_START=start runs the built app
 * (`next start`, as CI does after `turbo build`) instead of the dev server.
 */
const site = process.env.E2E_SITE_URL ?? "http://localhost:3000";
const web = site;
// The Nexus lives under /nexus on the same site.
const app = `${site}/nexus`;
const script = process.env.E2E_START === "start" ? "start" : "dev";

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  globalSetup: "./global-setup.ts",
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM }
          : {},
      },
    },
  ],
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  retries: 0,
  testDir: "./tests",
  timeout: 120_000,
  use: { trace: "retain-on-failure" },
  webServer: {
    command: `bun run --cwd ../web ${script}`,
    reuseExistingServer: true,
    timeout: 240_000,
    url: `${web}/`,
  },
  workers: 1,
});

export const urls = { app, web };
