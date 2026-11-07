import { config, withAnalyzer } from "@repo/next-config";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { env } from "@/env";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// No redirects (owner, Oct 14 and Oct 30, 2026; again Nov 7, 2026): an old
// address is simply not found. www.auibsal.org → auibsal.org is a Vercel
// domain setting.
//
// The design system (packages/brand, `bun run build:site`) is built into
// apps/web/design and shown inside the Diwan at /diwan/design, which frames
// it. /_design is a rewrite (not a redirect) to the API route that serves
// those files to staff only (owner, Nov 7, 2026); only the site may frame
// it, and search engines never index it.
let nextConfig: NextConfig = {
  ...config,
  headers: async () => [
    {
      headers: [
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
      ],
      source: "/_design/:path*",
    },
  ],
  outputFileTracingIncludes: {
    "/api/design/[...path]": ["./design/**/*"],
    "/api/email/signature": ["../../packages/brand/assets/fonts/*.ttf"],
  },
  rewrites: async () => [
    { destination: "/api/design/:path*", source: "/_design/:path*" },
  ],
};

if (env.ANALYZE === "true") {
  nextConfig = withAnalyzer(nextConfig);
}

export default withNextIntl(nextConfig);
