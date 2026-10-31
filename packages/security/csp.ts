export interface CspSources {
  connect?: string[];
  font?: string[];
  frame?: string[];
  img?: string[];
  media?: string[];
  script?: string[];
  worker?: string[];
}

/** A Content Security Policy, directive name to sources (or `true`). */
export type Csp = Record<string, readonly string[] | true>;

/** The third-party origins the site uses: Google Analytics, YouTube. */
export const defaultCspSources: CspSources = {
  connect: [
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
    "https://*.googletagmanager.com",
  ],
  // Next Stop episodes: YouTube's privacy-enhanced (no-cookie) player only.
  frame: ["https://www.youtube-nocookie.com"],
  img: [
    "https://*.google-analytics.com",
    "https://*.googletagmanager.com",
    "https://i.ytimg.com",
  ],
  script: ["https://www.googletagmanager.com"],
};

/**
 * Google AdSense, for Qirtas's ads (only with NEXT_PUBLIC_ADSENSE_CLIENT
 * set). The ads themselves render in Google's frames, under Google's own
 * policy.
 */
export const adsenseCspSources: CspSources = {
  connect: [
    "https://pagead2.googlesyndication.com",
    "https://*.adtrafficquality.google",
    "https://*.doubleclick.net",
  ],
  frame: [
    "https://googleads.g.doubleclick.net",
    "https://tpc.googlesyndication.com",
    "https://*.googlesyndication.com",
    "https://*.adtrafficquality.google",
    "https://www.google.com",
  ],
  img: [
    "https://pagead2.googlesyndication.com",
    "https://tpc.googlesyndication.com",
    "https://*.doubleclick.net",
    "https://*.adtrafficquality.google",
    "https://www.google.com",
  ],
  script: [
    "https://pagead2.googlesyndication.com",
    "https://*.googlesyndication.com",
    "https://*.adtrafficquality.google",
  ],
};

/** Cloudflare Turnstile, Supabase Auth's human check on the sign-in forms. */
export const turnstileCspSources: CspSources = {
  connect: ["https://challenges.cloudflare.com"],
  frame: ["https://challenges.cloudflare.com"],
  script: ["https://challenges.cloudflare.com"],
};

/** Supabase REST, Auth, Storage and Realtime (WebSocket) for a project URL. */
export const supabaseCspSources = (url: string | undefined): CspSources => {
  if (!url) {
    return {};
  }

  const { host, origin, protocol } = new URL(url);
  // A local stack is plain http, and its Realtime socket is plain ws.
  const socket = protocol === "http:" ? "ws" : "wss";

  return {
    connect: [origin, `${socket}://${host}`],
    img: [origin],
    media: [origin],
  };
};

const isDevelopment = process.env.NODE_ENV === "development";

const merge = (sources: CspSources[], key: keyof CspSources): string[] => [
  ...new Set(sources.flatMap((source) => source[key] ?? [])),
];

/**
 * The site's Content Security Policy: scripts from this origin and the
 * listed hosts, with `'unsafe-inline'` for Next.js' inline bootstrap
 * scripts (pages are statically rendered, so no per-request nonce).
 */
export const createContentSecurityPolicy = (...sources: CspSources[]): Csp => ({
  "base-uri": ["'none'"],
  "child-src": ["'none'"],
  "connect-src": ["'self'", ...merge(sources, "connect")],
  "default-src": ["'self'"],
  "font-src": ["'self'", "data:", ...merge(sources, "font")],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"],
  "frame-src": ["'self'", ...merge(sources, "frame")],
  "img-src": ["'self'", "blob:", "data:", ...merge(sources, "img")],
  "manifest-src": ["'self'"],
  "media-src": ["'self'", "blob:", ...merge(sources, "media")],
  "object-src": ["'none'"],
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
    ...merge(sources, "script"),
  ],
  "style-src": ["'self'", "'unsafe-inline'"],
  ...(isDevelopment ? {} : { "upgrade-insecure-requests": true as const }),
  "worker-src": ["'self'", "blob:", ...merge(sources, "worker")],
});

/** The policy as a header value. */
export const serializeCsp = (csp: Csp): string =>
  Object.entries(csp)
    .map(([name, value]) =>
      value === true ? name : `${name} ${value.join(" ")}`
    )
    .join("; ");
