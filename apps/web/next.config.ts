import { project } from "@repo/config";
import { config, withAnalyzer } from "@repo/next-config";
import { withSentry } from "@repo/observability/next-config";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { env } from "@/env";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const host = (name: string) => ({
  has: [{ type: "host" as const, value: `${name}.${project.domain}` }],
  permanent: true,
});

let nextConfig: NextConfig = {
  ...config,
  // The old hosts of the Nexus and the API (until October 24, 2026) keep
  // working: nexus.auibsal.org/ar/events → auibsal.org/ar/nexus/events,
  // api.auibsal.org/calendar/sal.ics → auibsal.org/api/calendar/sal.ics.
  // www.auibsal.org → auibsal.org stays a Vercel domain setting.
  redirects: async () => [
    {
      ...host("nexus"),
      destination: `${project.url}/:locale/nexus/:path*`,
      source: "/:locale(ar|ckb)/:path*",
    },
    {
      ...host("nexus"),
      destination: `${project.url}/nexus/:path*`,
      source: "/:path*",
    },
    {
      ...host("api"),
      destination: `${project.url}/api/:path*`,
      source: "/:path*",
    },
  ],
};

if (env.VERCEL) {
  nextConfig = withSentry(nextConfig);
}

if (env.ANALYZE === "true") {
  nextConfig = withAnalyzer(nextConfig);
}

export default withNextIntl(nextConfig);
