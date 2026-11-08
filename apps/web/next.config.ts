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
  // The Diwan by Council seat (decisions §6).
  ["/diwan/society/declarations", "/diwan/council/disclosures"],
  ["/diwan/society", "/diwan/council"],
  ["/diwan/society/:path*", "/diwan/council/:path*"],
  ["/diwan/people/service/certificates", "/diwan/qirtas/certificates"],
  [
    "/diwan/people/service/certificates/:path*",
    "/diwan/qirtas/certificates/:path*",
  ],
  ["/diwan/people/partners", "/diwan/partnerships"],
  ["/diwan/people/partners/:path*", "/diwan/partnerships/:path*"],
  ["/diwan/people", "/diwan/membership"],
  ["/diwan/people/:path*", "/diwan/membership/:path*"],
  ["/diwan/qirtas/video/episodes/:path*", "/diwan/media/episodes/:path*"],
  ["/diwan/qirtas/video/reels/:path*", "/diwan/media/reels/:path*"],
  ["/diwan/design", "/diwan/media/design"],
  ["/_design", "/diwan/media/design"],
  ["/_design/:path*", "/diwan/media/design"],
  ["/diwan/events/pitches/:path*", "/diwan/events/proposals/:path*"],
  ["/diwan/events/:ref/door", "/diwan/events/:ref/check-in"],
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
// apps/web/design. The Diwan's page /diwan/media/design shows its entries;
// their files are served to staff at /diwan/media/design/kit by the API
// route (decisions.md), and search engines never index them.
let nextConfig: NextConfig = {
  ...config,
  headers: async () => [
    // The API routes answer with JSON, CSV or a calendar (audit E5): the
    // transport and sniffing headers the pages get, and never framed or
    // indexed. The design system's files keep their own rule below.
    {
      headers: [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
      ],
      source: "/api/:path*",
    },
    {
      headers: [{ key: "X-Frame-Options", value: "DENY" }],
      source: "/api/:path((?!design/).*)",
    },
    ...LANGUAGE_PREFIXES.map((prefix) => ({
      headers: [
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
      ],
      source: `${prefix}/diwan/media/design/kit/:path*`,
    })),
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
  // The design system's files, under its page in the Diwan, ahead of the
  // Diwan's routes.
  rewrites: async () => ({
    afterFiles: [],
    beforeFiles: LANGUAGE_PREFIXES.map((prefix) => ({
      destination: "/api/design/:path*",
      source: `${prefix}/diwan/media/design/kit/:path*`,
    })),
    fallback: [],
  }),
};

if (env.ANALYZE === "true") {
  nextConfig = withAnalyzer(nextConfig);
}

export default withNextIntl(nextConfig);
