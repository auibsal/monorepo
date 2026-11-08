// @vitest-environment node
import sharp from "sharp";
import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { markedImage } = await import("@/lib/api/marked-image");

/** A plain paper-colored image with an author in its EXIF. */
const photo = (width: number, height: number) =>
  sharp({
    create: { background: "#f5f2ee", channels: 3, height, width },
  })
    .withExif({ IFD0: { Artist: "Layla Hassan" } })
    .jpeg()
    .toBuffer();

describe("readers' marked images", () => {
  test("a copy at reading size, its metadata left behind", async () => {
    const source = await photo(3200, 2000);
    const { height, jpeg, width } = await markedImage(
      new Uint8Array(source),
      "No. 10234 · 2026-11-08"
    );
    expect([width, height]).toEqual([1600, 1000]);
    const meta = await sharp(jpeg).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(1600);
    expect(meta.exif).toBeUndefined();
    expect(new TextDecoder("latin1").decode(jpeg)).not.toContain("Layla");
  });

  test("the mark is drawn across the image", async () => {
    const source = await photo(800, 600);
    const { jpeg } = await markedImage(new Uint8Array(source), "No. 10234");
    const plain = await sharp(source).raw().toBuffer();
    const marked = await sharp(jpeg).raw().toBuffer();
    let changed = 0;
    for (let i = 0; i < plain.length; i += 1) {
      if (Math.abs((plain[i] ?? 0) - (marked[i] ?? 0)) > 12) {
        changed += 1;
      }
    }
    // Faint, but over much of the picture.
    expect(changed / plain.length).toBeGreaterThan(0.005);
  });

  test("a mark can't break the drawing", async () => {
    const source = await photo(400, 300);
    await expect(
      markedImage(new Uint8Array(source), `No. <1> & "2"`)
    ).resolves.toBeDefined();
  });
});
