// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  derToRaw,
  lengthValue,
  openWalletMessage,
  type RootKey,
} from "@/lib/api/wallet-callback";

const ISSUER = "3388000000012345678";
const NOW = Date.parse("2026-10-25T12:00:00Z");

const base64 = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)));

/** A raw r‖s signature in DER, as Google sends them. */
const rawToDer = (raw: Uint8Array) => {
  const int = (bytes: Uint8Array) => {
    let value = bytes;
    while (value.length > 1 && value[0] === 0 && (value[1] ?? 0) < 0x80) {
      value = value.slice(1);
    }
    if ((value[0] ?? 0) >= 0x80) {
      value = Uint8Array.of(0, ...value);
    }
    return [0x02, value.length, ...value];
  };
  const body = [...int(raw.slice(0, 32)), ...int(raw.slice(32))];
  return Uint8Array.of(0x30, body.length, ...body);
};

const keyPair = () =>
  crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ]);

const sign = async (key: CryptoKey, data: Uint8Array<ArrayBuffer>) =>
  base64(
    rawToDer(
      new Uint8Array(
        await crypto.subtle.sign({ hash: "SHA-256", name: "ECDSA" }, key, data)
      )
    )
  );

const spki = async (key: CryptoKey) =>
  base64(await crypto.subtle.exportKey("spki", key));

/** A message sealed the way Google seals it. */
const seal = async (
  message: object,
  { recipient = ISSUER, root }: { recipient?: string; root: CryptoKeyPair }
) => {
  const intermediate = await keyPair();
  const signedKey = JSON.stringify({
    keyExpiration: String(NOW + 86_400_000),
    keyValue: await spki(intermediate.publicKey),
  });
  const signedMessage = JSON.stringify(message);
  return JSON.stringify({
    intermediateSigningKey: {
      signatures: [
        await sign(
          root.privateKey,
          lengthValue("GooglePayPasses", "ECv2SigningOnly", signedKey)
        ),
      ],
      signedKey,
    },
    protocolVersion: "ECv2SigningOnly",
    signature: await sign(
      intermediate.privateKey,
      lengthValue(
        "GooglePayPasses",
        recipient,
        "ECv2SigningOnly",
        signedMessage
      )
    ),
    signedMessage,
  });
};

const event = {
  classId: `${ISSUER}.sal-membership`,
  eventType: "save",
  expTimeMillis: NOW + 60_000,
  nonce: "n-1",
  objectId: `${ISSUER}.card-0123456789abcdef0123`,
};

describe("Google Wallet callbacks", () => {
  test("fields are length-prefixed, little-endian", () => {
    expect([...lengthValue("ab")]).toEqual([2, 0, 0, 0, 97, 98]);
  });

  test("a DER signature becomes r‖s", () => {
    const raw = Uint8Array.from({ length: 64 }, (_, i) => (i * 7 + 200) % 256);
    expect([...derToRaw(rawToDer(raw))]).toEqual([...raw]);
  });

  test("a message Google signed for us opens", async () => {
    const root = await keyPair();
    const rootKeys: RootKey[] = [
      {
        keyExpiration: String(NOW + 86_400_000),
        keyValue: await spki(root.publicKey),
        protocolVersion: "ECv2SigningOnly",
      },
    ];
    const body = await seal(event, { root });
    expect(
      await openWalletMessage(body, { issuerId: ISSUER, now: NOW, rootKeys })
    ).toEqual(event);
  });

  test("anything else is refused", async () => {
    const root = await keyPair();
    const stranger = await keyPair();
    const rootKeys: RootKey[] = [
      {
        keyValue: await spki(root.publicKey),
        protocolVersion: "ECv2SigningOnly",
      },
    ];
    const open = (sealed: string, now = NOW) =>
      openWalletMessage(sealed, { issuerId: ISSUER, now, rootKeys });

    // Not signed by a Google root key.
    expect(await open(await seal(event, { root: stranger }))).toBeNull();
    // Signed for another issuer.
    expect(
      await open(await seal(event, { recipient: "999", root }))
    ).toBeNull();
    // Expired.
    expect(await open(await seal(event, { root }), NOW + 120_000)).toBeNull();
    // Tampered with.
    const body = JSON.parse(await seal(event, { root }));
    body.signedMessage = body.signedMessage.replace("save", "del");
    expect(await open(JSON.stringify(body))).toBeNull();
    // Not JSON.
    expect(await open("nonsense")).toBeNull();
  });
});
