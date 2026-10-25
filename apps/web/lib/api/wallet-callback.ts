/**
 * Google Wallet's save and removal messages. Google signs each with the
 * Google Pay "ECv2SigningOnly" protocol: a Google root key (published at
 * KEYS_URL) signs a short-lived intermediate key, and the intermediate key
 * signs the message. Both signatures are ECDSA P-256 with SHA-256 over
 * length-prefixed fields (each one a 4-byte little-endian length and its
 * UTF-8 bytes): the sender "GooglePayPasses", the recipient (our issuer id,
 * for the message only), the protocol, and the signed text.
 * https://developers.google.com/wallet/generic/use-cases/use-callbacks-for-saves-and-deletions
 */

export const KEYS_URL = "https://pay.google.com/gp/m/issuer/keys";
const SENDER = "GooglePayPasses";
const PROTOCOL = "ECv2SigningOnly";

export interface RootKey {
  keyExpiration?: string;
  keyValue: string;
  protocolVersion: string;
}

export interface WalletEvent {
  classId: string;
  eventType: "del" | "save";
  expTimeMillis: number;
  nonce: string;
  objectId: string;
}

// As received: nothing in it is trusted until checked.
interface Sealed {
  intermediateSigningKey?: { signatures?: string[]; signedKey?: string };
  protocolVersion?: string;
  signature?: string;
  signedMessage?: string;
}

const encoder = new TextEncoder();

const fromBase64 = (value: string) =>
  Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

/** Each field as a 4-byte little-endian length and its UTF-8 bytes. */
export const lengthValue = (...fields: string[]) => {
  const parts = fields.map((f) => encoder.encode(f));
  const out = new Uint8Array(parts.reduce((n, p) => n + 4 + p.length, 0));
  const view = new DataView(out.buffer);
  let at = 0;
  for (const part of parts) {
    view.setUint32(at, part.length, true);
    out.set(part, at + 4);
    at += 4 + part.length;
  }
  return out;
};

/** A DER ECDSA signature as the raw r‖s that WebCrypto verifies. */
export const derToRaw = (der: Uint8Array) => {
  // SEQUENCE { INTEGER r, INTEGER s }; lengths are short-form for P-256.
  if (der[0] !== 0x30) {
    throw new Error("not a DER signature");
  }
  let at = der[1] === 0x81 ? 3 : 2;
  const int = () => {
    if (der[at] !== 0x02) {
      throw new Error("not a DER signature");
    }
    const length = der[at + 1] ?? 0;
    let value = der.slice(at + 2, at + 2 + length);
    at += 2 + length;
    while (value.length > 32 && value[0] === 0) {
      value = value.slice(1);
    }
    const padded = new Uint8Array(32);
    padded.set(value, 32 - value.length);
    return padded;
  };
  const r = int();
  const s = int();
  const raw = new Uint8Array(64);
  raw.set(r, 0);
  raw.set(s, 32);
  return raw;
};

const importKey = (spkiBase64: string) =>
  crypto.subtle.importKey(
    "spki",
    fromBase64(spkiBase64),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"]
  );

const verify = async (
  key: CryptoKey,
  signatureBase64: string,
  data: Uint8Array<ArrayBuffer>
) => {
  try {
    return await crypto.subtle.verify(
      { hash: "SHA-256", name: "ECDSA" },
      key,
      derToRaw(fromBase64(signatureBase64)),
      data
    );
  } catch {
    return false;
  }
};

const live = (expiration: string | number | undefined, now: number) =>
  expiration === undefined || Number(expiration) > now;

/**
 * The message, when Google signed it for this issuer and it hasn't expired;
 * null otherwise.
 */
export const openWalletMessage = async (
  body: string,
  {
    issuerId,
    now = Date.now(),
    rootKeys,
  }: { issuerId: string; now?: number; rootKeys: RootKey[] }
): Promise<WalletEvent | null> => {
  let sealed: Sealed;
  try {
    sealed = JSON.parse(body) as Sealed;
  } catch {
    return null;
  }
  const signedKey = sealed.intermediateSigningKey?.signedKey;
  const signatures = sealed.intermediateSigningKey?.signatures ?? [];
  if (
    sealed.protocolVersion !== PROTOCOL ||
    typeof sealed.signedMessage !== "string" ||
    typeof sealed.signature !== "string" ||
    typeof signedKey !== "string"
  ) {
    return null;
  }

  // 1. A current Google root key signed the intermediate key.
  const keyData = lengthValue(SENDER, PROTOCOL, signedKey);
  const roots = rootKeys.filter(
    (root) => root.protocolVersion === PROTOCOL && live(root.keyExpiration, now)
  );
  const checks = await Promise.all(
    roots.map(async (root) => {
      const key = await importKey(root.keyValue);
      const results = await Promise.all(
        signatures.map((signature) => verify(key, signature, keyData))
      );
      return results.includes(true);
    })
  );
  if (!checks.includes(true)) {
    return null;
  }

  // 2. The intermediate key is current and signed the message for us.
  const intermediate = JSON.parse(signedKey) as {
    keyExpiration: string;
    keyValue: string;
  };
  if (!live(intermediate.keyExpiration, now)) {
    return null;
  }
  const signed = await verify(
    await importKey(intermediate.keyValue),
    sealed.signature,
    lengthValue(SENDER, issuerId, PROTOCOL, sealed.signedMessage)
  );
  if (!signed) {
    return null;
  }

  // 3. The message itself hasn't expired.
  const message = JSON.parse(sealed.signedMessage) as WalletEvent;
  if (
    !live(message.expTimeMillis, now) ||
    (message.eventType !== "save" && message.eventType !== "del")
  ) {
    return null;
  }
  return { ...message, expTimeMillis: Number(message.expTimeMillis) };
};

let cachedKeys: { at: number; keys: RootKey[] } | null = null;

/** Google's root signing keys, fetched at most once an hour. */
export const walletRootKeys = async () => {
  if (cachedKeys && Date.now() - cachedKeys.at < 3_600_000) {
    return cachedKeys.keys;
  }
  const response = await fetch(KEYS_URL);
  if (!response.ok) {
    throw new Error(`Google Wallet keys request failed (${response.status})`);
  }
  const { keys } = (await response.json()) as { keys: RootKey[] };
  cachedKeys = { at: Date.now(), keys };
  return keys;
};
