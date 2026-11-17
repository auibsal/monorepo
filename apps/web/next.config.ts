import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { env } from "@/env";
import { formRedirects } from "@/lib/data/form-paths";
import { config, withAnalyzer } from "@/lib/next-config";
import { MOVED } from "@/lib/next-config/moved";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// www.auibsal.org → auibsal.org is a Vercel domain setting. English has no
// prefix; Arabic is under /ar. The moved addresses, each with why it
// stays, are in lib/next-config/moved.ts.
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
    // sniffing headers the pages get, and never framed or indexed (HSTS is
    // Cloudflare's, decisions.md, The site). The design system's files keep their own rule below.
    {
      headers: [
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
    // The checks for codes are never indexed (decisions.md, The site).
    ...LANGUAGE_PREFIXES.flatMap((prefix) =>
      [`${prefix}/verify`, `${prefix}/verify/:path*`].map((source) => ({
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
        source,
      }))
    ),
  ],
  outputFileTracingIncludes: {
    "/api/design/[...path]": ["./design/**/*"],
    "/api/email/signature": ["../../packages/brand/assets/fonts/*.ttf"],
  },
  // Off: with it, a missing event or piece answered 200 (its shared shell
  // streams first) and a piece's text-size buttons stopped answering.
  partialPrefetching: false,
  redirects: async () => [
    // The standard address password managers open to change a password
    // (W3C, "A Well-Known URL for Changing Passwords"): Settings, at its
    // password section. Not permanent, so the place can move.
    {
      destination: "/account/settings#password",
      permanent: false,
      source: "/.well-known/change-password",
    },
    ...LANGUAGE_PREFIXES.flatMap((prefix) =>
      [...MOVED, ...formRedirects].map(([from, to]) => ({
        destination: `${prefix}${to}`,
        permanent: true,
        source: `${prefix}${from}`,
      }))
    ),
  ],
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
