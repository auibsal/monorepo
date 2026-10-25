import "server-only";

import { importPKCS8, SignJWT } from "jose";
import { env } from "@/env";
import { origin } from "./urls";

/**
 * Google Wallet: the membership card as a Generic pass. The pass shows the
 * same live QR as the website card (Google computes the TOTP from the same
 * secret: RFC 6238, SHA-1, 30 seconds, 8 digits), so the door accepts
 * either. The class and the object travel inside the signed "Save to
 * Google Wallet" link; Google creates or updates them when it is opened.
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

const text = (value: string, locale: string) => ({
  defaultValue: { language: locale === "ar" ? "ar" : "en-US", value },
});

/** The signed link that adds (or refreshes) the member's pass. */
export const googleWalletLink = async (card: WalletCard) => {
  const issuer = env.GOOGLE_WALLET_ISSUER_ID ?? "";
  const classId = `${issuer}.sal-membership`;
  const site = origin();
  const ar = card.locale === "ar";
  const number = String(card.number).padStart(4, "0");
  const pass = {
    cardTitle: text(
      ar ? "جمعية الفنون والآداب" : "AUIB Society of Arts and Letters",
      card.locale
    ),
    classId,
    header: text(card.fullName, card.locale),
    heroImage: {
      sourceUri: { uri: `${site}/api/wallet/rosette/${card.number}` },
    },
    hexBackgroundColor: "#f5f2ee",
    id: `${issuer}.card-${card.code}`,
    logo: { sourceUri: { uri: `${site}/brand/sal-avatar-wallet.png` } },
    rotatingBarcode: {
      alternateText: number,
      totpDetails: {
        algorithm: "TOTP_SHA1",
        parameters: [{ key: card.secret, valueLength: 8 }],
        periodMillis: "30000",
      },
      type: "QR_CODE",
      valuePattern: `${site}${ar ? "/ar" : ""}/verify/member/${card.code}?t={totp_value_0}`,
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
  const key = await importPKCS8(
    (env.GOOGLE_WALLET_PRIVATE_KEY ?? "").replaceAll("\\n", "\n"),
    "RS256"
  );
  const token = await new SignJWT({
    origins: [site],
    payload: {
      genericClasses: [{ id: classId }],
      genericObjects: [pass],
    },
    typ: "savetowallet",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL ?? "")
    .setAudience("google")
    .setIssuedAt()
    .sign(key);
  return `https://pay.google.com/gp/v/save/${token}`;
};
