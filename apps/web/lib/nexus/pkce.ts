const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

/** 32 random bytes, base64url: for a state, a nonce or a verifier. */
export const randomString = () =>
  base64url(crypto.getRandomValues(new Uint8Array(32)));

/** PKCE (RFC 7636): a verifier kept here, its S256 challenge sent out. */
export const pkce = async () => {
  const verifier = randomString();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  return { challenge: base64url(new Uint8Array(digest)), verifier };
};
