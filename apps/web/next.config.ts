import { config, withAnalyzer } from "@repo/next-config";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { env } from "@/env";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// No redirects (owner, Oct 14 and Oct 30, 2026): www.auibsal.org →
// auibsal.org is a Vercel domain setting.
let nextConfig: NextConfig = { ...config };

if (env.ANALYZE === "true") {
  nextConfig = withAnalyzer(nextConfig);
}

export default withNextIntl(nextConfig);
