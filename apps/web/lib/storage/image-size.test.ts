import { describe, expect, it } from "vitest";
import { imageHeight } from "./image-size";

const png = (height: number) => {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0, 0, 0, 13], 8);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  new DataView(bytes.buffer).setUint32(16, 800);
  new DataView(bytes.buffer).setUint32(20, height);
  return bytes;
};

const jpeg = (height: number) => {
  // SOI, an APP0 segment of 16 bytes, then SOF0.
  const bytes = new Uint8Array(2 + 18 + 12);
  bytes.set([0xff, 0xd8], 0);
  bytes.set([0xff, 0xe0, 0x00, 0x10], 2);
  bytes.set([0xff, 0xc0, 0x00, 0x11, 0x08], 20);
  new DataView(bytes.buffer).setUint16(25, height);
  new DataView(bytes.buffer).setUint16(27, 900);
  return bytes;
};

const webpX = (height: number) => {
  const bytes = new Uint8Array(30);
  bytes.set([...new TextEncoder().encode("RIFF")], 0);
  bytes.set([...new TextEncoder().encode("WEBPVP8X")], 8);
  const h = height - 1;
  bytes.set([h % 256, Math.floor(h / 256) % 256, Math.floor(h / 65_536)], 27);
  return bytes;
};

describe("imageHeight", () => {
  it("reads a PNG's height", () => {
    expect(imageHeight(png(640))).toBe(640);
  });
  it("reads a JPEG's height", () => {
    expect(imageHeight(jpeg(1200))).toBe(1200);
  });
  it("reads an extended WebP's height", () => {
    expect(imageHeight(webpX(600))).toBe(600);
  });
  it("refuses what it can't read, an SVG included", () => {
    expect(
      imageHeight(new TextEncoder().encode('<svg height="900"></svg>'))
    ).toBeNull();
  });
});
