import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from "jose";

/**
 * Telegram's login (OpenID Connect, authorization code with PKCE), used
 * only to link a Telegram account to a signed-in Nexus member. Signing in
 * to the Nexus stays email only. https://core.telegram.org/bots/telegram-login
 */
export const TELEGRAM_ISSUER = "https://oauth.telegram.org";
const AUTHORIZE_URL = `${TELEGRAM_ISSUER}/auth`;
const TOKEN_URL = `${TELEGRAM_ISSUER}/token`;

// The Telegram id and username to link, and permission for the bot to write
// first (the greeting, the notices). Never the phone number.
const SCOPE = "openid profile telegram:bot_access";

let telegramKeys: JWTVerifyGetKey | undefined;
const keys = () => {
  telegramKeys ??= createRemoteJWKSet(
    new URL(`${TELEGRAM_ISSUER}/.well-known/jwks.json`)
  );
  return telegramKeys;
};

export const authorizeUrl = ({
  clientId,
  codeChallenge,
  redirectUri,
  state,
}: {
  clientId: number;
  codeChallenge: string;
  redirectUri: string;
  state: string;
}) => {
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: String(clientId),
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    state,
  }).toString();
  return url.toString();
};

export interface TelegramIdentity {
  telegramId: number;
  username: string | null;
}

export class TelegramLoginError extends Error {
  readonly code: "exchange_failed" | "invalid_token";

  constructor(code: TelegramLoginError["code"], options?: ErrorOptions) {
    super(`Telegram login: ${code}`, options);
    this.name = "TelegramLoginError";
    this.code = code;
  }
}

/**
 * Exchanges the authorization code for an id_token and verifies it: signed
 * by Telegram's published keys, issued by oauth.telegram.org, for this bot,
 * not expired. Returns the Telegram account it names.
 */
export const exchangeCode = async (
  {
    clientId,
    clientSecret,
    code,
    codeVerifier,
    redirectUri,
  }: {
    clientId: number;
    clientSecret: string;
    code: string;
    codeVerifier: string;
    redirectUri: string;
  },
  {
    fetcher = fetch,
    verifyKeys = keys(),
  }: { fetcher?: typeof fetch; verifyKeys?: JWTVerifyGetKey } = {}
): Promise<TelegramIdentity> => {
  const response = await fetcher(TOKEN_URL, {
    body: new URLSearchParams({
      client_id: String(clientId),
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
    signal: AbortSignal.timeout(10_000),
  });
  const tokens = (await response.json().catch(() => ({}))) as {
    id_token?: unknown;
  };
  if (!(response.ok && typeof tokens.id_token === "string")) {
    throw new TelegramLoginError("exchange_failed");
  }
  try {
    const { payload } = await jwtVerify(tokens.id_token, verifyKeys, {
      audience: String(clientId),
      issuer: TELEGRAM_ISSUER,
    });
    const telegramId = Number(payload.id);
    if (!(Number.isSafeInteger(telegramId) && telegramId > 0)) {
      throw new TelegramLoginError("invalid_token");
    }
    const username = payload.preferred_username;
    return {
      telegramId,
      username: typeof username === "string" && username ? username : null,
    };
  } catch (error) {
    throw new TelegramLoginError("invalid_token", { cause: error });
  }
};
