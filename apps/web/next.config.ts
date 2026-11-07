import { config, withAnalyzer } from "@repo/next-config";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { env } from "@/env";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Addresses that were shared and then moved redirect permanently (308), as
// "Cool URIs don't change" and US practice require (decisions §6); every
// other old address is simply not found. www.auibsal.org → auibsal.org is
// a Vercel domain setting.
const MOVED: readonly [from: string, to: string][] = [
  ["/membership", "/account"],
  ["/membership/:path*", "/account/:path*"],
  ["/library/privacy", "/privacy"],
  ["/library/terms-of-use", "/terms"],
  ["/library/accessibility", "/accessibility"],
  ["/partners/join", "/partners/apply"],
  // Your account's tabs match their pages (decisions §6).
  ["/account/society", "/account/elections"],
  ["/account/society/stand/:position", "/account/elections/:position"],
  ["/account/saved", "/account/work"],
  ["/account/settings/notices", "/account/settings/notifications"],
  ["/account/settings/declarations", "/account/settings/disclosures"],
  [
    "/account/record/:ref([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})",
    "/account/record/certificates/:ref",
  ],
  // Filters are query strings (decisions §6).
  ["/events/:month(\\d{4}-\\d{2})", "/events?month=:month"],
  ["/events/:month(\\d{4}-\\d{2})/society", "/events?month=:month"],
  ["/company/:month(\\d{4}-\\d{2})", "/events?host=company&month=:month"],
  ["/qirtas/archive/:month(\\d{4}-\\d{2})", "/qirtas/archive?month=:month"],
  [
    "/qirtas/archive/:month(\\d{4}-\\d{2})/:section",
    "/qirtas/archive?month=:month&section=:section",
  ],
  ["/search/:q", "/search?q=:q"],
  ["/qirtas/editions/list", "/qirtas/editions?view=list"],
];
// English has no prefix; Arabic is under /ar.
const LANGUAGE_PREFIXES = ["", "/ar"] as const;
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
  redirects: async () =>
    LANGUAGE_PREFIXES.flatMap((prefix) =>
      MOVED.map(([from, to]) => ({
        destination: `${prefix}${to}`,
        permanent: true,
        source: `${prefix}${from}`,
      }))
    ),
  rewrites: async () => [
    { destination: "/api/design/:path*", source: "/_design/:path*" },
  ],
};

if (env.ANALYZE === "true") {
  nextConfig = withAnalyzer(nextConfig);
}

export default withNextIntl(nextConfig);
