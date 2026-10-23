import {
  defaults,
  nosecone,
  type Options,
  withVercelToolbar,
} from "@nosecone/next";
import {
  apiCspSources,
  type CspSources,
  createContentSecurityPolicy,
  defaultCspSources,
  supabaseCspSources,
} from "./csp";

// Nosecone security headers configuration
// https://docs.arcjet.com/nosecone/quick-start
const baseOptions = (...extra: CspSources[]): Options => ({
  ...defaults,
  contentSecurityPolicy: createContentSecurityPolicy(
    {},
    defaultCspSources,
    supabaseCspSources(process.env.NEXT_PUBLIC_SUPABASE_URL),
    apiCspSources(process.env.NEXT_PUBLIC_API_URL),
    ...extra
  ),
  // `require-corp` blocks third-party images, pixels and iframes that do not
  // send a Cross-Origin-Resource-Policy header (most analytics endpoints).
  crossOriginEmbedderPolicy: false,
  // Keeps the origin on cross-site requests so analytics attribution works,
  // without leaking full URLs (paths, query strings) to third parties.
  referrerPolicy: { policy: ["strict-origin-when-cross-origin"] },
  // Two years, every subdomain, and eligible for the browsers' preload list
  // (submit auibsal.org once at hstspreload.org).
  strictTransportSecurity: {
    includeSubDomains: true,
    maxAge: 63_072_000,
    preload: true,
  },
});

/**
 * Security headers, with any extra CSP sources an app needs (auibsal.org's
 * AdSense). The Vercel Toolbar's origins are allowed only when it is
 * enabled (`FLAGS_SECRET` is set).
 */
export const noseconeOptionsWith = (...extra: CspSources[]): Options =>
  process.env.FLAGS_SECRET
    ? withVercelToolbar(baseOptions(...extra))
    : baseOptions(...extra);

/**
 * The same headers for a page that is also a Telegram Mini App: Telegram's
 * web app (web.telegram.org) shows Mini Apps in a frame, so it may frame
 * the page. The phone and desktop apps open it in their own view.
 */
export const telegramMiniApp = (options: Options): Options => {
  const csp = options.contentSecurityPolicy;
  return {
    ...options,
    contentSecurityPolicy:
      typeof csp === "object"
        ? {
            ...csp,
            directives: {
              ...csp.directives,
              frameAncestors: ["'self'", "https://web.telegram.org"],
            },
          }
        : csp,
    xFrameOptions: false,
  };
};

/** Security headers for every app. */
export const noseconeOptions: Options = noseconeOptionsWith();

/**
 * The same headers as static `headers()` entries for next.config, for apps
 * without a proxy (apps/app is client-first and also builds as a static
 * export, where headers come from the host instead).
 */
export const securityHeaders = (options: Options = noseconeOptions) => [
  {
    headers: [...nosecone(options)].map(([key, value]) => ({ key, value })),
    source: "/:path*",
  },
];

/**
 * Adds Nosecone's security headers to an existing proxy response (for example
 * one that carries refreshed auth cookies or an i18n rewrite) instead of
 * replacing it.
 */
export const withSecurityHeaders = <T extends Response>(
  response: T,
  options: Options = noseconeOptions
): T => {
  for (const [name, value] of nosecone(options)) {
    response.headers.set(name, value);
  }

  return response;
};
