import { project } from "@repo/config";
import { config, withAnalyzer } from "@repo/next-config";
import { withSentry } from "@repo/observability/next-config";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { env } from "@/env";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// docs.auibsal.org was SAL Docs on Mintlify (until Oct 9, 2026). Its pages
// now live here (the documents), in the team's Notion workspace (the officer
// handbook, reached through the Nexus's /handbook, which forwards each page)
// and in the repository (the platform runbooks); old links land in the
// right place.
const DOCS_HOST = [{ type: "host" as const, value: "docs.auibsal.org" }];
const NEXUS_HANDBOOK = "https://nexus.auibsal.org/en/handbook";
const RUNBOOKS = `${project.repoUrl}/blob/main/docs/platform`;
const handbookPages = [
  ["introduction", "introduction"],
  ["sign-in", "sign-in"],
  ["events", "events"],
  ["journal", "journal"],
  ["content", "content"],
  ["charity", "charity"],
  ["members", "members"],
  ["settings", "settings"],
  ["officers/brand", "brand"],
] as const;

const docsRedirects = async () => [
  // The docs site's overview and glossary have no page of their own here.
  ...["/documents/overview", "/documents/glossary"].map((source) => ({
    destination: `${project.hosts.web}/en/documents`,
    has: DOCS_HOST,
    permanent: true,
    source,
  })),
  // Same slugs as packages/sal-data/documents.json.
  {
    destination: `${project.hosts.web}/en/documents/:slug`,
    has: DOCS_HOST,
    permanent: true,
    source: "/documents/:slug",
  },
  ...handbookPages.map(([from, slug]) => ({
    destination: `${NEXUS_HANDBOOK}?page=${slug}`,
    has: DOCS_HOST,
    permanent: true,
    source: `/${from}`,
  })),
  {
    destination: `${RUNBOOKS}/:page.md`,
    has: DOCS_HOST,
    permanent: true,
    source: "/platform/:page",
  },
  {
    destination: `${project.hosts.web}/en/documents`,
    has: DOCS_HOST,
    permanent: true,
    source: "/:path*",
  },
];

// The AUIB Literary Journal became Waraq (owner, Oct 14, 2026): its pages
// moved under /waraq.
const journalRedirects = ["", "/en", "/ar"].flatMap((prefix) => [
  {
    destination: `${prefix}/waraq`,
    permanent: true,
    source: `${prefix}/journal`,
  },
  {
    destination: `${prefix}/waraq/pieces/:slug`,
    permanent: true,
    source: `${prefix}/journal/pieces/:slug`,
  },
  {
    destination: `${prefix}/waraq/authors/:slug`,
    permanent: true,
    source: `${prefix}/journal/contributors/:slug`,
  },
  {
    destination: `${prefix}/waraq/editions/:slug`,
    permanent: true,
    source: `${prefix}/journal/:slug`,
  },
]);

let nextConfig: NextConfig = {
  ...config,
  redirects: async () => [...(await docsRedirects()), ...journalRedirects],
};

// www.auibsal.org → auibsal.org is configured as a redirect domain in Vercel.

if (env.VERCEL) {
  nextConfig = withSentry(nextConfig);
}

if (env.ANALYZE === "true") {
  nextConfig = withAnalyzer(nextConfig);
}

export default withNextIntl(nextConfig);
