import { project } from "@repo/config";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { env } from "@/env";
import { formRedirects } from "@/lib/data/form-paths";
import { config, withAnalyzer } from "@/lib/next-config";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// An address that was shared (in an email, a post, a poster or a QR code)
// and then changed answers with a permanent redirect (308) to its new one;
// an address never shared simply changes (decisions.md, The site).
// www.auibsal.org → auibsal.org is a Vercel domain setting.
// English has no prefix; Arabic is under /ar.
const LANGUAGE_PREFIXES = ["", "/ar"] as const;
const MOVED: readonly [from: string, to: string][] = [
  // Submit to Qirtas's door (Qirtas).
  // Editions is the one door (decisions.md, Qirtas): every old address of
  // Submit to Qirtas opens its open calls; /haven is Haven's own page.
  ["/qirtas/write", "/qirtas/editions/open"],
  ["/qirtas/write/:path*", "/qirtas/editions/open"],
  ["/qirtas/submit", "/qirtas/editions/open"],
  ["/qirtas/submit/:path*", "/qirtas/editions/open"],
  ["/haven", "/qirtas/editions/haven"],
  // The partner dashboard's five tabs (decisions.md, The site).
  ["/partners/dashboard/people", "/partners/dashboard/guests"],
  ["/partners/dashboard/events", "/partners/dashboard"],
  ["/membership", "/account"],
  ["/membership/:path*", "/account/:path*"],
  ["/library/privacy", "/privacy"],
  ["/library/terms-of-use", "/terms"],
  ["/library/accessibility", "/accessibility"],
  ["/library/security", "/security"],
  ["/partners/join", "/partners/apply"],
  // Your account's tabs match their pages (decisions §6).
  ["/account/society", "/account"],
  ["/account/society/stand/:position", "/account/elections/:position"],
  // The tabs of decisions.md, Your account (the eighth prompt, 3).
  ["/account/calendar", "/account/events"],
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
  ["/diwan/events/pitches/:path*", "/diwan/events/proposals/:path*"],
  ["/diwan/events/:ref/door", "/diwan/events/:ref/check-in"],
  [
    "/account/record/:ref([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})",
    "/account/documents/certificates/:ref",
  ],
  // The tab is Documents (decisions.md, Documents and forms): certificate
  // and letter emails linked to Record.
  ["/account/record", "/account/documents"],
  ["/account/record/:path*", "/account/documents/:path*"],
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
  // Qirtas's themed collections are Editions (decisions.md, Qirtas); the
  // issues address of Nov 11 moves back.
  ["/qirtas/issues", "/qirtas/editions"],
  // The writing workshop moved to Tue Dec 8 (decisions.md, Events).
  [
    "/events/writing-workshop-2026-11-17",
    "/events/writing-workshop-2026-12-08",
  ],
  ["/qirtas/issues/:slug", "/qirtas/editions/:slug"],
  // Your account in six tabs (decisions.md, The site): the card and an open
  // election are on Today, applications under Roles; Saved and the profile
  // step are gone, and the name is no longer edited in Settings.
  ["/account/card", "/account"],
  ["/account/elections", "/account"],
  ["/account/applications", "/account/roles"],
  ["/account/saved", "/account"],
  ["/account/settings/profile", "/account/settings"],
  ["/welcome", "/account"],
  ["/welcome/:path*", "/account"],
  // One sign-up on one screen (decisions.md, Members).
  ["/sign-up/guest", "/sign-up"],
  // Nothing about members is public but bylines and role holders.
  ["/qirtas/authors/:slug", "/qirtas"],
  ["/contact", "/about/contact"],
  ["/diwan/qirtas/issues", "/diwan/qirtas/editions"],
  ["/diwan/qirtas/issues/:ref", "/diwan/qirtas/editions/:ref"],
];
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
    // mta-sts.auibsal.org serves the MTA-STS policy only (lib/mta-sts.ts);
    // any other address there is the site's own.
    {
      destination: `${project.url}/:path*`,
      has: [
        {
          type: "host" as const,
          value: `mta-sts.${new URL(project.url).host}`,
        },
      ],
      permanent: true,
      source: "/:path((?!\\.well-known/mta-sts\\.txt$).*)",
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
