import { config, withAnalyzer } from "@repo/next-config";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { env } from "@/env";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// No redirects (owner, Oct 14 and Oct 30, 2026): www.auibsal.org →
// auibsal.org is a Vercel domain setting. The exceptions are the owner's
// own (Nov 4, 2026), in `redirects` below.
//
// The design system (packages/brand, `bun run build:site`) is built into
// public/_design and shown inside the Diwan at /diwan/design, which frames
// it: only the site may frame it, and search engines never index it.
/**
 * The owner's redirects (Nov 4, 2026): the two Listening Room evenings
 * published under the Salon's addresses before the programs were split,
 * and the retired names' old addresses (the Callboard is Get involved; the
 * Prizes are the Qirtas Awards).
 */
const MOVED: [from: string, to: string][] = [
  ["/events/salon-2027-03-16", "/events/listening-room-2027-03-16"],
  ["/events/salon-2027-05-11", "/events/listening-room-2027-05-11"],
  ["/callboard", "/get-involved"],
  ["/prizes", "/qirtas/awards"],
  ["/awards", "/qirtas/awards"],
  ["/qirtas/prizes", "/qirtas/awards"],
  ["/diwan/qirtas/prizes", "/diwan/qirtas/awards"],
];

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
  redirects: async () =>
    MOVED.flatMap(([from, to]) => [
      { destination: to, permanent: true, source: from },
      { destination: `/ar${to}`, permanent: true, source: `/ar${from}` },
    ]),
};

if (env.ANALYZE === "true") {
  nextConfig = withAnalyzer(nextConfig);
}

export default withNextIntl(nextConfig);
