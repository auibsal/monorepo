import "server-only";

import { importPKCS8, SignJWT } from "jose";
import { env } from "@/env";
import { api, origin, site } from "./urls";

/**
 * Google Wallet: the membership card as a Generic pass. The pass shows the
 * same live QR as the website card (Google computes the TOTP from the same
 * secret: RFC 6238, SHA-1, 30 seconds, 8 digits), so the door accepts
 * either. The class and the object travel inside the signed "Save to
 * Google Wallet" link; Google creates them when it is opened. A pass that
 * already exists is brought up to date (and made active again) through the
 * Wallet API, and a pass whose card stopped being good is marked expired.
 * Runbook: docs/platform/wallet.md.
 */
export interface WalletCard {
  code: string;
  fullName: string;
  locale: "ar" | "en";
  memberSince: string | null;
  number: number;
  secret: string;
  tier: string;
}

export const walletConfigured = () =>
  Boolean(
    env.GOOGLE_WALLET_ISSUER_ID &&
      env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL &&
      env.GOOGLE_WALLET_PRIVATE_KEY
  );

const WALLET_API = "https://walletobjects.googleapis.com/walletobjects/v1";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/wallet_object.issuer";

const issuer = () => env.GOOGLE_WALLET_ISSUER_ID ?? "";

/** The pass class every membership card belongs to. */
export const walletClassId = () => `${issuer()}.sal-membership`;

/** The pass for a card code. */
export const walletObjectId = (code: string) => `${issuer()}.card-${code}`;

/** The card code a pass was issued for, or null for another issuer's. */
export const walletCodeOf = (objectId: string) => {
  const prefix = `${issuer()}.card-`;
  return objectId.startsWith(prefix) ? objectId.slice(prefix.length) : null;
};

const text = (value: string, locale: string) => ({
  defaultValue: { language: locale === "ar" ? "ar" : "en-US", value },
});

/** The member's pass: what the card's face shows, in their language. */
const passFor = (card: WalletCard) => {
  const base = origin();
  const ar = card.locale === "ar";
  const number = String(card.number).padStart(4, "0");
  return {
    cardTitle: text(
      ar ? "جمعية الفنون والآداب" : "AUIB Society of Arts and Letters",
      card.locale
    ),
    classId: walletClassId(),
    header: text(card.fullName, card.locale),
    heroImage: {
      sourceUri: { uri: api(`/wallet/rosette/${card.number}`) },
    },
    hexBackgroundColor: "#f5f2ee",
    id: walletObjectId(card.code),
    linksModuleData: {
      uris: [
        {
          description: ar ? "العضوية" : "Membership",
          id: "membership",
          uri: site(card.locale, "/membership"),
        },
        {
          description: ar ? "ما يجري" : "What's on",
          id: "events",
          uri: site(card.locale, "/events"),
        },
      ],
    },
    logo: { sourceUri: { uri: `${base}/brand/sal-avatar-wallet.png` } },
    rotatingBarcode: {
      alternateText: number,
      totpDetails: {
        algorithm: "TOTP_SHA1",
        parameters: [{ key: card.secret, valueLength: 8 }],
        periodMillis: "30000",
      },
      type: "QR_CODE",
      valuePattern: `${base}${ar ? "/ar" : ""}/verify/member/${card.code}?t={totp_value_0}`,
    },
    state: "ACTIVE",
    subheader: text(card.tier, card.locale),
    textModulesData: [
      { body: number, header: ar ? "الرقم" : "Number", id: "number" },
      ...(card.memberSince
        ? [
            {
              body: card.memberSince,
              header: ar ? "عضو منذ" : "Member since",
              id: "since",
            },
          ]
        : []),
    ],
  };
};

const signingKey = () =>
  importPKCS8(
    (env.GOOGLE_WALLET_PRIVATE_KEY ?? "").replaceAll("\\n", "\n"),
    "RS256"
  );

/** The signed link that adds the member's pass. */
export const googleWalletLink = async (card: WalletCard) => {
  const token = await new SignJWT({
    origins: [origin()],
    payload: {
      // Used only when the class doesn't exist yet.
      genericClasses: [
        {
          callbackOptions: { url: api("/wallet/google/callback") },
          id: walletClassId(),
          multipleDevicesAndHoldersAllowedStatus: "ONE_USER_ALL_DEVICES",
        },
      ],
      genericObjects: [passFor(card)],
    },
    typ: "savetowallet",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL ?? "")
    .setAudience("google")
    .setIssuedAt()
    .sign(await signingKey());
  return `https://pay.google.com/gp/v/save/${token}`;
};

// ── The Wallet API, as the service account ──────────────────────────────────

let cachedToken: { until: number; value: string } | null = null;

const accessToken = async () => {
  if (cachedToken && cachedToken.until > Date.now() + 60_000) {
    return cachedToken.value;
  }
  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL ?? "")
    .setAudience(TOKEN_URL)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(await signingKey());
  const response = await fetch(TOKEN_URL, {
    body: new URLSearchParams({
      assertion,
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    }),
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Google token request failed (${response.status})`);
  }
  const body = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    until: Date.now() + body.expires_in * 1000,
    value: body.access_token,
  };
  return body.access_token;
};

/** Writes a pass; false when Google has no such pass (never saved). */
const writePass = async (
  method: "PATCH" | "PUT",
  objectId: string,
  body: object
) => {
  const response = await fetch(
    `${WALLET_API}/genericObject/${encodeURIComponent(objectId)}`,
    {
      body: JSON.stringify(body),
      headers: {
        authorization: `Bearer ${await accessToken()}`,
        "content-type": "application/json",
      },
      method,
    }
  );
  if (response.status === 404) {
    return false;
  }
  if (!response.ok) {
    throw new Error(`Google Wallet ${method} failed (${response.status})`);
  }
  return true;
};

/**
 * Brings an existing pass up to date and active again (a renewed
 * membership, a new tier or name). False when the member never saved it:
 * the link creates it.
 */
export const refreshWalletPass = (card: WalletCard) =>
  writePass("PUT", walletObjectId(card.code), passFor(card));

/** Marks a pass expired: Wallet shows it as no longer valid. */
export const expireWalletPass = (code: string) =>
  writePass("PATCH", walletObjectId(code), { state: "EXPIRED" });

/**
 * Whether the member holds the pass, from Google's own record: true when
 * it is saved, false when there is no such pass or nobody holds it, null
 * when Google can't be asked. Used when the save callback never came.
 */
export const walletPassHeld = async (code: string) => {
  const response = await fetch(
    `${WALLET_API}/genericObject/${encodeURIComponent(walletObjectId(code))}`,
    { headers: { authorization: `Bearer ${await accessToken()}` } }
  );
  if (response.status === 404) {
    return false;
  }
  if (!response.ok) {
    return null;
  }
  const body = (await response.json()) as {
    hasUsers?: boolean;
    state?: string;
  };
  return Boolean(body.hasUsers) && body.state !== "EXPIRED";
};

let callbackSet = false;

/**
 * Makes sure the pass class calls back on saves and removals. The signed
 * link sets this only when it creates the class, so a class made before
 * the callback existed never called; this brings it up to date once per
 * server instance.
 */
export const ensureWalletCallback = async () => {
  if (callbackSet) {
    return;
  }
  const response = await fetch(
    `${WALLET_API}/genericClass/${encodeURIComponent(walletClassId())}`,
    {
      body: JSON.stringify({
        callbackOptions: { url: api("/wallet/google/callback") },
      }),
      headers: {
        authorization: `Bearer ${await accessToken()}`,
        "content-type": "application/json",
      },
      method: "PATCH",
    }
  );
  // 404: no class yet; the link creates it with the callback.
  callbackSet = response.ok || response.status === 404;
};
