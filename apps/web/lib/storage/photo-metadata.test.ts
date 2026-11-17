import { describe, expect, test } from "vitest";
import {
  hasContentCredentials,
  hasLocation,
  verifyCredentialsUrl,
} from "./photo-metadata";

/** A little-endian TIFF block whose IFD0 points to a GPS IFD. */
const tiff = (withGps: boolean) => {
  const b = new Uint8Array(64);
  const v = new DataView(b.buffer);
  b.set([0x49, 0x49, 0x2a, 0x00]);
  v.setUint32(4, 8, true);
  // IFD0: one entry, the GPS pointer to offset 26.
  v.setUint16(8, 1, true);
  v.setUint16(10, 0x88_25, true);
  v.setUint16(12, 4, true);
  v.setUint32(14, 1, true);
  v.setUint32(18, 26, true);
  // GPS IFD: latitude, or only the version.
  v.setUint16(26, 1, true);
  v.setUint16(28, withGps ? 0x00_02 : 0x00_00, true);
  return b;
};

const jpeg = (segments: [number, Uint8Array][]) => {
  const parts: number[] = [0xff, 0xd8];
  for (const [marker, data] of segments) {
    const length = data.length + 2;
    parts.push(0xff, marker, Math.floor(length / 256), length % 256, ...data);
  }
  parts.push(0xff, 0xda, 0, 2, 0xff, 0xd9);
  return new Uint8Array(parts);
};

const exif = (withGps: boolean) =>
  new Uint8Array([
    ...Array.from("Exif\0\0", (c) => c.charCodeAt(0)),
    ...tiff(withGps),
  ]);

describe("photo metadata", () => {
  test("a JPEG with a GPS position is found", () => {
    expect(hasLocation(jpeg([[0xe1, exif(true)]]))).toBe(true);
  });

  test("a JPEG exported without location passes", () => {
    expect(hasLocation(jpeg([[0xe1, exif(false)]]))).toBe(false);
    expect(hasLocation(jpeg([]))).toBe(false);
  });

  test("Content Credentials in a JPEG's APP11 are found", () => {
    const jumbf = new Uint8Array(
      Array.from("JP..jumbc2pa", (c) => c.charCodeAt(0))
    );
    expect(hasContentCredentials(jpeg([[0xeb, jumbf]]))).toBe(true);
    expect(hasContentCredentials(jpeg([[0xe1, exif(false)]]))).toBe(false);
  });
});

const be32 = (n: number) => [
  Math.floor(n / 16_777_216) % 256,
  Math.floor(n / 65_536) % 256,
  Math.floor(n / 256) % 256,
  n % 256,
];
const le32 = (n: number) => [...be32(n)].reverse();
const ascii4 = (text: string) => Array.from(text, (c) => c.charCodeAt(0));

/** A PNG with the given chunks (CRCs are not checked). */
const png = (chunks: [string, Uint8Array][]) =>
  new Uint8Array([
    0x89,
    ...ascii4("PNG"),
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...chunks.flatMap(([kind, data]) => [
      ...be32(data.length),
      ...ascii4(kind),
      ...data,
      0,
      0,
      0,
      0,
    ]),
  ]);

/** A WebP with the given chunks. */
const webp = (chunks: [string, Uint8Array][]) => {
  const body = chunks.flatMap(([kind, data]) => [
    ...ascii4(kind),
    ...le32(data.length),
    ...data,
    ...(data.length % 2 ? [0] : []),
  ]);
  return new Uint8Array([
    ...ascii4("RIFF"),
    ...le32(body.length + 4),
    ...ascii4("WEBP"),
    ...body,
  ]);
};

describe("photo metadata in PNG and WebP", () => {
  test("a PNG's eXIf location is found, and its caBX credentials", () => {
    expect(hasLocation(png([["eXIf", tiff(true)]]))).toBe(true);
    expect(hasLocation(png([["eXIf", tiff(false)]]))).toBe(false);
    expect(hasContentCredentials(png([["caBX", new Uint8Array(4)]]))).toBe(
      true
    );
    expect(hasContentCredentials(png([["IDAT", new Uint8Array(4)]]))).toBe(
      false
    );
  });

  test("a WebP's EXIF location is found, with or without its prefix", () => {
    expect(hasLocation(webp([["EXIF", tiff(true)]]))).toBe(true);
    expect(hasLocation(webp([["EXIF", exif(true)]]))).toBe(true);
    expect(hasLocation(webp([["EXIF", tiff(false)]]))).toBe(false);
    expect(hasContentCredentials(webp([["C2PA", new Uint8Array(2)]]))).toBe(
      true
    );
  });

  test("other files carry neither, and verifying links Content Credentials", () => {
    const other = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(hasLocation(other)).toBe(false);
    expect(hasContentCredentials(other)).toBe(false);
    expect(verifyCredentialsUrl("https://auibsal.org/a b.jpg")).toBe(
      "https://contentcredentials.org/verify?source=https%3A%2F%2Fauibsal.org%2Fa%20b.jpg"
    );
  });
});
