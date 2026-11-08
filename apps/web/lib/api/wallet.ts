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
  number: number;
  /** The role held now, in the pass's language; none without one. */
  role: string | null;
  secret: string;
  /** The year since. */
  since: number | null;
  /** The class in words, or Guest. */
  tier: string;
}

const CLASSES = {
  ar: {
    associate: "عضو منتسب",
    guest: "ضيف",
    honorary: "عضو فخري",
    member: "عضو",
    partner: "فريق الشريك",
  },
  en: {
    associate: "Associate Member",
    guest: "Guest",
    honorary: "Honorary Member",
    member: "Member",
    partner: "Partner team",
  },
} as const;

/** What membership.wallet_card returns for a person. */
export interface WalletCardRow {
  code: string;
  full_name_ar: string | null;
  full_name_en: string | null;
  kind: string | null;
  locale: string | null;
  number: number;
  role_ar: string | null;
  role_en: string | null;
  secret: string;
  since: number | null;
  tier: string | null;
}

/** The pass's fields from the person's card, in their language. */
export const walletCardFrom = (row: WalletCardRow): WalletCard => {
  const locale = row.locale === "ar" ? "ar" : "en";
  const classes: Record<string, string> = CLASSES[locale];
  const kind = row.kind ?? "member";
  const tier =
    (kind === "member" ? classes[row.tier ?? "member"] : classes[kind]) ??
    classes.member ??
    "";
  return {
    code: row.code,
    fullName: (locale === "ar" && row.full_name_ar) || (row.full_name_en ?? ""),
    locale,
    number: row.number,
    role: (locale === "ar" ? row.role_ar : row.role_en) ?? null,
    secret: row.secret,
    since: row.since,
    tier,
  };
};

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
const walletObjectId = (code: string) => `${issuer()}.card-${code}`;

/** The card code a pass was issued for, or null for another issuer's. */
export const walletCodeOf = (objectId: string) => {
  const prefix = `${issuer()}.card-`;
  return objectId.startsWith(prefix) ? objectId.slice(prefix.length) : null;
};

const text = (value: string, locale: string) => ({
  defaultValue: { language: locale === "ar" ? "ar" : "en-US", value },
});

/**
 * The pass: the card's fields (decisions §6, §11: one design, the same
 * fields everywhere): the name, the class or Guest, the number, the role
 * held, the year since and the live QR, in the holder's language.
 */
const passFor = (card: WalletCard) => {
  const base = origin();
  const ar = card.locale === "ar";
  const number = String(card.number).padStart(5, "0");
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
          description: ar ? "حسابك" : "Your account",
          id: "membership",
          uri: site(card.locale, "/account"),
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
      {
        body: number,
        header: ar ? "الرقم" : "No.",
        id: "number",
      },
      ...(card.role
        ? [{ body: card.role, header: ar ? "المنصب" : "Role", id: "role" }]
        : []),
      ...(card.since
        ? [
            {
              body: String(card.since),
              header: ar ? "منذ" : "Since",
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

/**
 * Gives a saved pass a new number (the renumbering of Nov 8, 2026,
 * decisions §10), changing only the fields that show it. False when the
 * pass isn't in Google Wallet.
 */
export const renumberWalletPass = async (code: string, value: number) => {
  const objectId = walletObjectId(code);
  const response = await fetch(
    `${WALLET_API}/genericObject/${encodeURIComponent(objectId)}`,
    { headers: { authorization: `Bearer ${await accessToken()}` } }
  );
  if (response.status === 404) {
    return false;
  }
  if (!response.ok) {
    throw new Error(`Google Wallet GET failed (${response.status})`);
  }
  const pass = (await response.json()) as {
    rotatingBarcode?: Record<string, unknown>;
    textModulesData?: { body: string; header: string; id: string }[];
  };
  const number = String(value).padStart(5, "0");
  return writePass("PATCH", objectId, {
    heroImage: { sourceUri: { uri: api(`/wallet/rosette/${value}`) } },
    rotatingBarcode: { ...pass.rotatingBarcode, alternateText: number },
    textModulesData: (pass.textModulesData ?? []).map((m) =>
      m.id === "number" ? { ...m, body: number } : m
    ),
  });
};

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
