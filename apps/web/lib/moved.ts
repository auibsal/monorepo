import type { NextConfig } from "next";

type Redirect = Awaited<
  ReturnType<NonNullable<NextConfig["redirects"]>>
>[number];

/**
 * The overhaul's new addresses (Oct 30, 2026). The one exception to "no
 * redirects": the old addresses are in emails already sent, in calendars
 * and in bookmarks, so each forwards permanently to its new place. A
 * record's old `?id=` (or `?slug=`) becomes the new address's last part.
 */
interface Move {
  readonly from: string;
  /** The query parameter that names the record, if the old page took one. */
  readonly param?: "id" | "slug";
  readonly to: string;
}

const SITE: readonly Move[] = [
  { from: "/governance", to: "/about/council" },
  { from: "/partners", to: "/about/partners" },
  { from: "/contact", to: "/about/contact" },
  { from: "/media-kit", to: "/about/press" },
  { from: "/give", to: "/events/second-chapter" },
  { from: "/privacy", to: "/library/privacy" },
  { from: "/newsletter", to: "/sunday-paper" },
  { from: "/newsletter/confirm", to: "/sunday-paper/confirm" },
  { from: "/newsletter/unsubscribe", to: "/sunday-paper/unsubscribe" },
  { from: "/callboard", to: "/get-involved" },
  { from: "/setup", to: "/welcome" },
  { from: "/events/book", to: "/membership/calendar" },
  { from: "/society", to: "/membership/society" },
  { from: "/membership/service", to: "/membership/record" },
  { from: "/membership/profile", to: "/membership/settings/profile" },
  { from: "/membership/more", to: "/membership/settings/more" },
  {
    from: "/membership/certificate",
    param: "id",
    to: "/membership/record/:id",
  },
  { from: "/membership/certificate", to: "/membership/record" },
  {
    from: "/membership/requests/view",
    param: "id",
    to: "/membership/requests/:id",
  },
  { from: "/membership/requests/view", to: "/membership/requests" },
  { from: "/qirtas/work", param: "id", to: "/membership/work/:id" },
  { from: "/qirtas/work", to: "/membership/work" },
  {
    from: "/qirtas/submission",
    param: "id",
    to: "/membership/work/submissions/:id",
  },
  { from: "/qirtas/submission", to: "/membership/work" },
  { from: "/qirtas/piece", param: "slug", to: "/qirtas/read/:slug" },
  { from: "/qirtas/piece", to: "/membership/work" },
  { from: "/qirtas/puzzles/:slug", to: "/qirtas/games/:slug" },
];

/** The Diwan's sections under their new names, records by address. */
const DIWAN_PATHS: readonly Move[] = [
  { from: "/journal/piece", param: "id", to: "/qirtas/pieces/:id" },
  { from: "/journal/piece", to: "/qirtas/pieces/new" },
  { from: "/journal/issue", param: "id", to: "/qirtas/editions/:id" },
  { from: "/journal/issue", to: "/qirtas/editions/new" },
  { from: "/journal/puzzle", param: "id", to: "/qirtas/games/:id" },
  { from: "/journal/puzzle", to: "/qirtas/games/new" },
  { from: "/journal/entry", param: "id", to: "/qirtas/review/:id" },
  { from: "/journal/submission", param: "id", to: "/qirtas/submissions/:id" },
  { from: "/journal/:rest*", to: "/qirtas" },
  { from: "/productions", to: "/company" },
  { from: "/recognition", to: "/service" },
  { from: "/content/page", param: "id", to: "/site/pages/:id" },
  { from: "/content/page", to: "/site/pages/new" },
  { from: "/content", to: "/site" },
  { from: "/charity/campaign", param: "id", to: "/second-chapter/:id" },
  { from: "/charity/campaign", to: "/second-chapter/new" },
  { from: "/charity", to: "/second-chapter" },
  { from: "/forms", to: "/requests" },
  { from: "/ads/ad", param: "id", to: "/site/ads/:id" },
  { from: "/ads/ad", to: "/site/ads/new" },
  { from: "/ads", to: "/site/ads" },
  { from: "/events/edit", param: "id", to: "/events/:id" },
  { from: "/events/edit", to: "/events/new" },
  { from: "/events/check-in", param: "id", to: "/events/:id/door" },
  { from: "/events/check-in", to: "/events/door" },
  { from: "/members/member", param: "id", to: "/members/:id" },
  { from: "/governance/minutes", param: "id", to: "/governance/minutes/:id" },
  { from: "/governance/minutes", to: "/governance/minutes/new" },
];
const DIWAN = DIWAN_PATHS.map((move) => ({
  ...move,
  from: `/diwan${move.from}`,
  to: `/diwan${move.to}`,
}));

/** Every move, for English (no prefix) and for each prefixed language. */
export const movedRedirects = (prefixes: readonly string[]): Redirect[] =>
  [...SITE, ...DIWAN].flatMap((move) =>
    ["", ...prefixes.map((prefix) => `/${prefix}`)].map((prefix) => ({
      destination: `${prefix}${move.to}`,
      ...(move.param
        ? {
            has: [
              {
                key: move.param,
                type: "query" as const,
                value: `(?<${move.param}>.+)`,
              },
            ],
          }
        : {}),
      permanent: true,
      source: `${prefix}${move.from}`,
    }))
  );
