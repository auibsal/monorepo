import { clientEnv as env } from "@/env.client";

/**
 * The IDEA Pass (owner, 2026-10-26): once SAL is registered there, it is
 * the only way to sign in, and where students prove their AUIB address.
 * Until both public values are set, the email sign-in stays.
 */
export const passEnabled = Boolean(
  env.NEXT_PUBLIC_PASS_ISSUER && env.NEXT_PUBLIC_PASS_CLIENT_ID
);

/** SAL's app at the Pass (public). */
export const passClientId = env.NEXT_PUBLIC_PASS_CLIENT_ID ?? "";

/** The IDEA's site, where the live Pass card lives. */
export const PASS_SITE = "https://theideaiq.com";

/** The member's live Pass card, with the code that changes every 30 seconds. */
export const passCardUrl = (locale: string) =>
  `${PASS_SITE}${locale === "ar" ? "/ar" : ""}/pass`;

/**
 * Whether the members' pages frame the live card itself (The IDEA's
 * embed, allowed per app in its Developers settings) instead of its picture.
 */
export const passEmbedded =
  passEnabled && env.NEXT_PUBLIC_PASS_EMBED === "true";

/** The embed page for SAL's app, in the page's language. */
export const passEmbedUrl = (locale: string, clientId: string) =>
  `${passCardUrl(locale)}/embed?client_id=${encodeURIComponent(clientId)}`;

/** The height The IDEA's embed reports, if this message is that. */
export const embedHeight = (event: { data: unknown; origin: string }) => {
  if (event.origin !== PASS_SITE) {
    return null;
  }
  const data = event.data as { height?: unknown; type?: unknown } | null;
  return data?.type === "idea-pass-card" &&
    typeof data.height === "number" &&
    Number.isFinite(data.height)
    ? Math.min(Math.max(Math.round(data.height), 120), 1200)
    : null;
};
