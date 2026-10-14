import { config, withAnalyzer } from "@repo/next-config";
import { withSentry } from "@repo/observability/next-config";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { env } from "@/env";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/**
 * The Nexus holds no secrets. Every read and write goes to Supabase with the
 * member's token (RLS decides) or to apps/api. Its only server code is the
 * locale proxy (proxy.ts). Security headers are set in vercel.json.
 */
// Images are served as they are (member uploads are already sized).
let nextConfig: NextConfig = {
  ...config,
  images: { ...config.images, unoptimized: true },
};

if (env.VERCEL) {
  nextConfig = withSentry(nextConfig);
}

if (env.ANALYZE === "true") {
  nextConfig = withAnalyzer(nextConfig);
}

export default withNextIntl(nextConfig);
