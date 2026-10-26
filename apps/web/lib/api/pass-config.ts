import { env } from "@/env";

/** SAL's registration at The IDEA Pass, or null while it isn't set up. */
export const passConfig = () => {
  const issuer = env.NEXT_PUBLIC_PASS_ISSUER;
  const clientId = env.NEXT_PUBLIC_PASS_CLIENT_ID;
  const clientSecret = env.PASS_CLIENT_SECRET;
  return issuer && clientId && clientSecret
    ? { clientId, clientSecret, issuer }
    : null;
};

// The Pass sends people back to one page, in either language.
const RETURN_PATH = /^(\/[a-z]{2})?\/auth\/pass$/;

export const isReturnPage = (redirectUri: string) => {
  try {
    const url = new URL(redirectUri);
    return (
      url.origin === new URL(env.NEXT_PUBLIC_SITE_URL).origin &&
      RETURN_PATH.test(url.pathname) &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
};
