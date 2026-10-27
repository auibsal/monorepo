import {
  createRemoteJWKSet,
  type JWTPayload,
  type JWTVerifyGetKey,
  jwtVerify,
} from "jose";

/**
 * The IDEA Pass (owner, 2026-10-26): the only way to sign in to
 * auibsal.org, and where students prove they study at AUIB. OpenID
 * Connect, authorization code with PKCE, SAL as a confidential client.
 * Only who the person is crosses over (SAL's own id for them at the Pass,
 * their verified address, a name, a language, and a yes or no for
 * student status; never the university address); SAL's own data stays
 * here. docs/platform/idea-pass.md
 */

// The person's addresses, names and language, and their student status.
const SCOPE = "openid email profile student";
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TRAILING_SLASH = /\/$/;

interface Discovery {
  authorization_endpoint: string;
  issuer: string;
  jwks_uri: string;
  token_endpoint: string;
}

export class PassError extends Error {
  readonly code: "discovery_failed" | "exchange_failed" | "invalid_token";

  constructor(code: PassError["code"], options?: ErrorOptions) {
    super(`The IDEA Pass: ${code}`, options);
    this.name = "PassError";
    this.code = code;
  }
}

const discoveries = new Map<string, Promise<Discovery>>();
const keySets = new Map<string, JWTVerifyGetKey>();

/** The Pass's endpoints, read once per issuer from its discovery document. */
export const discover = (issuer: string, fetcher: typeof fetch = fetch) => {
  let found = discoveries.get(issuer);
  if (!found) {
    found = (async () => {
      const url = `${issuer.replace(TRAILING_SLASH, "")}/.well-known/openid-configuration`;
      const response = await fetcher(url, {
        signal: AbortSignal.timeout(10_000),
      });
      const doc = (await response
        .json()
        .catch(() => ({}))) as Partial<Discovery>;
      if (
        !(
          response.ok &&
          doc.issuer &&
          doc.authorization_endpoint &&
          doc.token_endpoint &&
          doc.jwks_uri
        )
      ) {
        throw new PassError("discovery_failed");
      }
      return doc as Discovery;
    })();
    // A failed read is tried again on the next sign-in.
    found.catch(() => discoveries.delete(issuer));
    discoveries.set(issuer, found);
  }
  return found;
};

const keysFor = (jwksUri: string) => {
  let set = keySets.get(jwksUri);
  if (!set) {
    set = createRemoteJWKSet(new URL(jwksUri));
    keySets.set(jwksUri, set);
  }
  return set;
};

export const authorizeUrl = (
  discovery: Discovery,
  {
    clientId,
    codeChallenge,
    locale,
    nonce,
    redirectUri,
    state,
  }: {
    clientId: string;
    codeChallenge: string;
    locale: string;
    nonce: string;
    redirectUri: string;
    state: string;
  }
) => {
  const url = new URL(discovery.authorization_endpoint);
  url.search = new URLSearchParams({
    client_id: clientId,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    nonce,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    state,
    ui_locales: locale,
  }).toString();
  return url.toString();
};

export interface PassIdentity {
  /** The address the Pass has checked, if it has. */
  email: string | null;
  familyName: string | null;
  givenName: string | null;
  locale: "ar" | "en" | null;
  /**
   * The last day the Pass vouches they study at AUIB (YYYY-MM-DD), or null
   * when it doesn't.
   */
  studentUntil: string | null;
  /** SAL's own id for the person at the Pass: stable, never reused. */
  sub: string;
}

const text = (value: unknown, max = 120) =>
  typeof value === "string" && value.trim() !== ""
    ? value.trim().slice(0, max)
    : null;

/**
 * The Pass's student claim: `{ verified: true, university: "auib", until:
 * "YYYY-MM-DD" }` or `{ verified: false }`. SAL counts AUIB only.
 */
const auibUntil = (claim: unknown) => {
  if (!(claim && typeof claim === "object")) {
    return null;
  }
  const { until, university, verified } = claim as Record<string, unknown>;
  return verified === true &&
    university === "auib" &&
    typeof until === "string" &&
    DATE.test(until)
    ? until
    : null;
};

/** Reads the claims SAL uses from a verified id_token. */
export const identityFrom = (payload: JWTPayload): PassIdentity => {
  const sub = text(payload.sub, 255);
  if (!sub) {
    throw new PassError("invalid_token");
  }
  const address = text(payload.email, 254)?.toLowerCase() ?? null;
  const email = payload.email_verified === true ? address : null;
  const locale = text(payload.locale, 8)?.slice(0, 2);
  return {
    email,
    familyName: text(payload.family_name, 60),
    givenName: text(payload.given_name, 60),
    locale: locale === "ar" || locale === "en" ? locale : null,
    studentUntil: auibUntil(payload.student),
    sub,
  };
};

/**
 * Exchanges the authorization code for tokens and verifies the id_token:
 * signed with the Pass's published keys, issued by it, for SAL, not
 * expired, and carrying the nonce this sign-in started with.
 */
export const exchangeCode = async (
  discovery: Discovery,
  {
    clientId,
    clientSecret,
    code,
    codeVerifier,
    nonce,
    redirectUri,
  }: {
    clientId: string;
    clientSecret: string;
    code: string;
    codeVerifier: string;
    nonce: string;
    redirectUri: string;
  },
  {
    fetcher = fetch,
    verifyKeys = keysFor(discovery.jwks_uri),
  }: { fetcher?: typeof fetch; verifyKeys?: JWTVerifyGetKey } = {}
): Promise<PassIdentity> => {
  const response = await fetcher(discovery.token_endpoint, {
    body: new URLSearchParams({
      client_id: clientId,
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
    headers: {
      Authorization: `Basic ${btoa(`${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
    signal: AbortSignal.timeout(10_000),
  });
  const tokens = (await response.json().catch(() => ({}))) as {
    id_token?: unknown;
  };
  if (!(response.ok && typeof tokens.id_token === "string")) {
    throw new PassError("exchange_failed");
  }
  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(tokens.id_token, verifyKeys, {
      audience: clientId,
      issuer: discovery.issuer,
    }));
  } catch (error) {
    throw new PassError("invalid_token", { cause: error });
  }
  if (payload.nonce !== nonce) {
    throw new PassError("invalid_token");
  }
  return identityFrom(payload);
};
