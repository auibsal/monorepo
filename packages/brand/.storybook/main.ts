import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { StorybookConfig } from "@storybook/nextjs";

const require = createRequire(import.meta.url);

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
const getAbsolutePath = (value: string) =>
  dirname(require.resolve(join(value, "package.json")));

/**
 * The design system, SAL-MED-02, in the Diwan at /diwan/design (owner, Nov
 * 4, 2026). `bun run build:site` builds it into apps/web/public/_design,
 * which the Diwan's page frames. Every path in the stories is relative
 * ("brand-kit/…", "brand/…"), so the same stories work in `bun run dev`.
 */
const config: StorybookConfig = {
  addons: [
    getAbsolutePath("@storybook/addon-docs"),
    getAbsolutePath("@storybook/addon-themes"),
  ],
  // No vendor notices or usage reporting in the SAL Design System.
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
  framework: {
    name: getAbsolutePath("@storybook/nextjs"),
    options: {},
  },
  staticDirs: [
    { from: "../assets/logos", to: "/brand" },
    { from: "../assets/mascot", to: "/mascot" },
    // The design system's own files: tokens, CSS, fonts, icons, the social
    // templates and their PNGs, and the printables, for viewing and download.
    { from: "../assets", to: "/brand-kit" },
    // The sign-in emails' templates (Emails/Sign-in).
    {
      from: "../../database/supabase/templates",
      to: "/auth-templates",
    },
  ],
  stories: [
    "../stories/**/*.mdx",
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],
};

export default config;
