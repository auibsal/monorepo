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
// The Diwan (the officers' administration) lives under /diwan on the same
// site; members' pages are on the site itself.
const app = `${site}/diwan`;
const script = process.env.E2E_START === "start" ? "start" : "dev";
const launchOptions = process.env.PLAYWRIGHT_CHROMIUM
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM }
  : {};
const PHONE_SPECS = /(public|games|keyboard)\.spec\.ts/;

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  globalSetup: "./global-setup.ts",
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], launchOptions },
    },
    // The public pages and the games on the phones most visitors use, in
    // both languages (the journeys that sign in run on the desktop only).
    {
      name: "pixel",
      testMatch: PHONE_SPECS,
      use: { ...devices["Pixel 7"], launchOptions },
    },
    {
      name: "iphone",
      testMatch: PHONE_SPECS,
      // iPhone's size, touch and user agent, in Chromium (the one browser
      // CI installs).
      use: {
        ...devices["iPhone 14"],
        browserName: "chromium",
        defaultBrowserType: "chromium",
        launchOptions,
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
