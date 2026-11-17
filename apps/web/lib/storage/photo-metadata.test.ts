import { describe, expect, test } from "vitest";
import { hasContentCredentials, hasLocation } from "./photo-metadata";

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
