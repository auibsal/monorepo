import { defaults, type Options } from "@nosecone/next";

type CspConfig = Exclude<
  NonNullable<Options["contentSecurityPolicy"]>,
  boolean
>;
type Directives = NonNullable<CspConfig["directives"]>;
type Source = Exclude<
  Extract<Directives["connectSrc"], readonly unknown[]>[number],
  () => unknown
>;

export interface CspSources {
  connect?: string[];
  font?: string[];
  frame?: string[];
  img?: string[];
  media?: string[];
  script?: string[];
  worker?: string[];
}

/**
 * Third-party origins used by the integrations bundled with this template.
 * Remove the ones a project does not use to tighten the policy further.
 */
export const defaultCspSources: CspSources = {
  connect: [
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
    "https://*.googletagmanager.com",
    "https://*.sentry.io",
  ],
  // Side Quest episodes: YouTube's privacy-enhanced (no-cookie) player only.
  frame: ["https://www.youtube-nocookie.com"],
  img: [
    "https://*.google-analytics.com",
    "https://*.googletagmanager.com",
    "https://i.ytimg.com",
  ],
  script: ["https://www.googletagmanager.com"],
};

/**
 * Google AdSense, for Waraq's ads on auibsal.org (apps/web only, and only
 * with NEXT_PUBLIC_ADSENSE_CLIENT set). The ads themselves render in
 * Google's frames, under Google's own policy.
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

/**
 * Cloudflare Turnstile, Supabase Auth's human check on the Nexus sign-in,
 * sign-up and reset forms.
 */
export const turnstileCspSources: CspSources = {
  connect: ["https://challenges.cloudflare.com"],
  frame: ["https://challenges.cloudflare.com"],
  script: ["https://challenges.cloudflare.com"],
};

/**
 * The IDEA Pass's live card, framed on the members' pages once The IDEA lets
 * SAL embed it. The frame is The IDEA's page: the code never reaches SAL.
 */
export const ideaPassCspSources: CspSources = {
  frame: ["https://theideaiq.com"],
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

const merge = (sources: CspSources[], key: keyof CspSources): Source[] =>
  [...new Set(sources.flatMap((source) => source[key] ?? []))] as Source[];

/**
 * Builds a Content Security Policy for Nosecone.
 *
 * Default (`strict: false`) is compatible with statically rendered pages and
 * with static exports: scripts are limited to this origin and the
 * listed hosts, with `'unsafe-inline'` for Next.js' inline bootstrap scripts.
 *
 * `strict: true` switches to nonce + `'strict-dynamic'`, which is stronger but
 * requires every page to be dynamically rendered (Next.js can only attach a
 * per-request nonce to dynamic responses).
 */
export const createContentSecurityPolicy = (
  { strict = false }: { strict?: boolean } = {},
  ...sources: CspSources[]
): CspConfig => {
  const scriptSrc: NonNullable<Directives["scriptSrc"]> = strict
    ? [
        ...(defaults.contentSecurityPolicy.directives.scriptSrc ?? []),
        "'strict-dynamic'",
        ...merge(sources, "script"),
      ]
    : [
        "'self'",
        "'unsafe-inline'",
        ...(isDevelopment ? (["'unsafe-eval'"] as const) : []),
        ...merge(sources, "script"),
      ];

  return {
    directives: {
      ...defaults.contentSecurityPolicy.directives,
      connectSrc: ["'self'", ...merge(sources, "connect")],
      fontSrc: ["'self'", "data:", ...merge(sources, "font")],
      frameSrc: ["'self'", ...merge(sources, "frame")],
      imgSrc: ["'self'", "blob:", "data:", ...merge(sources, "img")],
      mediaSrc: ["'self'", "blob:", ...merge(sources, "media")],
      scriptSrc,
      upgradeInsecureRequests: !isDevelopment,
      workerSrc: ["'self'", "blob:", ...merge(sources, "worker")],
    },
  };
};
