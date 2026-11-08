import {
  type Csp,
  type CspSources,
  createContentSecurityPolicy,
  defaultCspSources,
  serializeCsp,
  supabaseCspSources,
  turnstileCspSources,
} from "./csp";

export interface SecurityOptions {
  readonly csp: Csp;
  /** Whether other sites may frame the page (X-Frame-Options). */
  readonly frameable?: boolean;
}

/** Security headers, with any extra CSP sources a page needs. */
export const securityOptionsWith = (
  ...extra: CspSources[]
): SecurityOptions => ({
  csp: createContentSecurityPolicy(
    defaultCspSources,
    supabaseCspSources(process.env.NEXT_PUBLIC_SUPABASE_URL),
    turnstileCspSources,
    ...extra
  ),
});

/**
 * The same headers for a page that is also a Telegram Mini App: Telegram's
 * web app (web.telegram.org) shows Mini Apps in a frame, so it may frame
 * the page. The phone and desktop apps open it in their own view.
 */
export const telegramMiniApp = (options: SecurityOptions): SecurityOptions => ({
  csp: {
    ...options.csp,
    "frame-ancestors": ["'self'", "https://web.telegram.org"],
  },
  frameable: true,
});

/** A fresh nonce for one response: 128 random bits, base64. */
export const createNonce = () =>
  btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));

/** The SHA-256 source (`'sha256-…'`) for an inline script the page carries. */
export const scriptHash = async (script: string) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(script)
  );
  return `'sha256-${btoa(String.fromCharCode(...new Uint8Array(digest)))}'`;
};

/**
 * The policy for a page rendered for one request (your account, the
 * Diwan): a script runs only with this response's nonce, or if one that
 * did loaded it ('strict-dynamic': Next's chunks, Turnstile), or if its
 * hash is listed (the theme script in the shared <head>). 'unsafe-inline'
 * and the hosts stay for browsers older than CSP 3; newer ones ignore them
 * once a nonce is present.
 */
export const withNonce = (
  options: SecurityOptions,
  nonce: string,
  hashes: readonly string[] = []
): SecurityOptions => {
  const script = options.csp["script-src"];
  return {
    ...options,
    csp: {
      ...options.csp,
      "script-src": [
        ...(script === true || script === undefined ? [] : script),
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        ...hashes,
      ],
    },
  };
};

/** The Content-Security-Policy header's value. */
export const contentSecurityPolicy = (options: SecurityOptions) =>
  serializeCsp(options.csp);

/** Every header, in the order they are sent. */
const securityHeaders = (
  options: SecurityOptions = securityOptionsWith()
): [string, string][] => [
  ["Content-Security-Policy", serializeCsp(options.csp)],
  // `require-corp` (COEP) is left off: it blocks third-party images, pixels
  // and frames that send no Cross-Origin-Resource-Policy (most analytics).
  ["Cross-Origin-Opener-Policy", "same-origin"],
  ["Cross-Origin-Resource-Policy", "same-origin"],
  ["Origin-Agent-Cluster", "?1"],
  // The origin on cross-site requests (analytics attribution), never the
  // full URL.
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  // Two years, every subdomain, on the browsers' preload list.
  ["Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload"],
  ["X-Content-Type-Options", "nosniff"],
  ["X-DNS-Prefetch-Control", "off"],
  ["X-Download-Options", "noopen"],
  ...(options.frameable
    ? []
    : ([["X-Frame-Options", "SAMEORIGIN"]] as [string, string][])),
  ["X-Permitted-Cross-Domain-Policies", "none"],
  ["X-XSS-Protection", "0"],
];

/**
 * Adds the security headers to an existing proxy response (one that carries
 * refreshed auth cookies or an i18n rewrite) instead of replacing it.
 */
export const withSecurityHeaders = <T extends Response>(
  response: T,
  options?: SecurityOptions
): T => {
  for (const [name, value] of securityHeaders(options)) {
    response.headers.set(name, value);
  }
  return response;
};
