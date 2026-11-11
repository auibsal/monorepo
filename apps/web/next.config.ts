import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { env } from "@/env";
import { config, withAnalyzer } from "@/lib/next-config";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// One redirect only: Write for Qirtas moved to /qirtas/submit, and the
// old address leads there until further notice (decisions §17). Otherwise
// links point at the current address, and an old one is simply not found.
// www.auibsal.org → auibsal.org is a Vercel domain setting.
// English has no prefix; Arabic is under /ar.
const LANGUAGE_PREFIXES = ["", "/ar"] as const;
//
// The design system (packages/brand, `bun run build:site`) is built into
// apps/web/design. The Diwan's page /diwan/media/design shows its entries;
// their files are served to staff at /diwan/media/design/kit by the API
// route (decisions.md), and search engines never index them.
let nextConfig: NextConfig = {
  ...config,
  // Pages are prerendered around what each request needs; published
  // reads stay cached by tag and are refreshed on publish (lib/supabase.ts).
  cacheComponents: true,
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
  // Off: with it, a missing event or piece answered 200 (its shared shell
  // streams first) and a piece's text-size buttons stopped answering.
  partialPrefetching: false,
  redirects: async () =>
    LANGUAGE_PREFIXES.flatMap((prefix) => [
      {
        destination: `${prefix}/qirtas/submit`,
        permanent: false,
        source: `${prefix}/qirtas/write`,
      },
      {
        destination: `${prefix}/qirtas/submit/:path*`,
        permanent: false,
        source: `${prefix}/qirtas/write/:path*`,
      },
    ]),
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
