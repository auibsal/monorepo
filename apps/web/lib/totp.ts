// biome-ignore-all lint/suspicious/noBitwiseOperators: RFC 4226 truncation works on bits
/**
 * The live card's code: RFC 6238 TOTP (HMAC-SHA1, 30-second steps, 8
 * digits), computed in the browser from the card's secret. The database
 * (private.totp) and Google Wallet compute the same digits from the same
 * secret, so the door accepts whichever the member shows.
 */
export const TOTP_PERIOD_SECONDS = 30;
const DIGITS = 8;
const MODULUS = 10 ** DIGITS;

const fromHex = (hex: string) => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};

/** The step a moment falls in. */
export const totpStep = (atMs: number) =>
  Math.floor(atMs / 1000 / TOTP_PERIOD_SECONDS);

/** Seconds left before the code changes. */
export const totpSecondsLeft = (atMs: number) =>
  TOTP_PERIOD_SECONDS - (Math.floor(atMs / 1000) % TOTP_PERIOD_SECONDS);

export const totp = async (secretHex: string, step: number) => {
  const key = await crypto.subtle.importKey(
    "raw",
    fromHex(secretHex),
    { hash: "SHA-1", name: "HMAC" },
    false,
    ["sign"]
  );
  const counter = new ArrayBuffer(8);
  new DataView(counter).setBigUint64(0, BigInt(step));
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, counter));
  // biome-ignore lint/style/noNonNullAssertion: an HMAC-SHA1 is 20 bytes
  const offset = mac[19]! & 0x0f;
  const view = new DataView(mac.buffer);
  const value = view.getUint32(offset) & 0x7f_ff_ff_ff;
  return String(value % MODULUS).padStart(DIGITS, "0");
};
