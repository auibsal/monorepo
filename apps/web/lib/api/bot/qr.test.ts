import { inflateSync } from "node:zlib";
import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { qrPng } = await import("./qr");

describe("the ticket's QR code as a PNG", () => {
  test("is a square grayscale PNG with a white quiet zone", () => {
    const png = qrPng("sal:ticket:abc", 4);
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
    const width = png.readUInt32BE(16);
    expect(png.readUInt32BE(20)).toBe(width);
    const idat = png.indexOf("IDAT");
    const length = png.readUInt32BE(idat - 4);
    const raw = inflateSync(png.subarray(idat + 4, idat + 4 + length));
    expect(raw.length).toBe((width + 1) * width);
    // The first row is quiet zone: filter byte, then white.
    expect(raw[1]).toBe(0xff);
    expect(raw.subarray(1, width + 1).every((b) => b === 0xff)).toBe(true);
    // Somewhere in the middle there is ink.
    expect(raw.includes(0, width + 2)).toBe(true);
  });
});
