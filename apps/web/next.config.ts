import { config, withAnalyzer } from "@repo/next-config";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { env } from "@/env";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// No redirects (owner, Oct 14 and Oct 30, 2026): www.auibsal.org →
// auibsal.org is a Vercel domain setting. The one exception is the
// owner's own (Nov 4, 2026): /design goes to the brand kit at /brand.
//
// The brand kit (packages/brand, `bun run build:site`) is built into
// public/_brand and served at /brand; files in public/brand (the logos
// the emails load) are found first. It is public and read-only, and kept
// out of search engines until it is reviewed.
const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

let nextConfig: NextConfig = {
  ...config,
  headers: async () => [
    { headers: noindex, source: "/brand" },
    { headers: noindex, source: "/brand/:path*" },
    { headers: noindex, source: "/_brand/:path*" },
  ],
  redirects: async () => [
    { destination: "/brand", permanent: false, source: "/design" },
    { destination: "/brand", permanent: false, source: "/design/:path*" },
  ],
  rewrites: async () => ({
    afterFiles: [
      { destination: "/_brand/index.html", source: "/brand" },
      { destination: "/_brand/:path*", source: "/brand/:path*" },
    ],
    beforeFiles: [],
    fallback: [],
  }),
};

if (env.ANALYZE === "true") {
  nextConfig = withAnalyzer(nextConfig);
}

export default withNextIntl(nextConfig);
