import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/env";

/**
 * The drawn share image (`/[locale]/og?title=…`) draws a title only when it
 * carries the site's signature, so nobody can make a branded image say what
 * they like. The key is derived from CRON_SECRET; without it (locally) no
 * title is signed and the image shows the Society's name.
 */
const key = () =>
  env.CRON_SECRET ? `auibsal.org share image\n${env.CRON_SECRET}` : null;

const digest = (secret: string, locale: string, title: string) =>
  createHmac("sha256", secret)
    .update(`${locale}\n${title}`)
    .digest("base64url")
    .slice(0, 22);

/** The signature for a title in a language, or null when unsigned. */
export const signOgTitle = (locale: string, title: string) => {
  const secret = key();
  return secret ? digest(secret, locale, title) : null;
};

/** Whether a signature is the site's for this title and language. */
export const isSignedOgTitle = (
  locale: string,
  title: string,
  signature: string | null
) => {
  const secret = key();
  if (!(secret && signature)) {
    return false;
  }
  const expected = Buffer.from(digest(secret, locale, title));
  const received = Buffer.from(signature);
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
};
