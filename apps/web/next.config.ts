import { defaultLocale, locales } from "@repo/internationalization/config";
import { config, withAnalyzer } from "@repo/next-config";
import { withSentry } from "@repo/observability/next-config";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { env } from "@/env";
import { movedRedirects } from "@/lib/moved";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// www.auibsal.org → auibsal.org is a Vercel domain setting. The only
// redirects are the overhaul's moved addresses (Oct 30, 2026; lib/moved.ts).
let nextConfig: NextConfig = {
  ...config,
  redirects: async () =>
    movedRedirects(locales.filter((locale) => locale !== defaultLocale)),
};

if (env.VERCEL) {
  nextConfig = withSentry(nextConfig);
}

if (env.ANALYZE === "true") {
  nextConfig = withAnalyzer(nextConfig);
}

export default withNextIntl(nextConfig);
