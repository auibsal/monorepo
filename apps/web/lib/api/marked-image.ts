import "server-only";
import sharp from "sharp";

/** Readers see the work at reading size, not at print size. */
const MAX_WIDTH = 1600;
/** The brand's ink (tokens.css --sal-ink), faint, with paper around it. */
const INK = "#273236";

const escapeXml = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/**
 * An image drawn again for a reader: re-encoded (which leaves its metadata
 * behind), no wider than reading size, and with the reader's mark (their
 * card number and the day) repeated across it at a slant, faint enough to
 * look through and too many times to crop away.
 */
export const markedImage = async (bytes: Uint8Array, mark: string) => {
  const image = sharp(bytes, { failOn: "error" })
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true });
  const { data, info } = await image.toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const size = Math.max(14, Math.round(width / 40));
  const stepX = size * 18;
  const stepY = size * 6;
  const rows: string[] = [];
  for (let row = 0, y = -height; y < height * 2; row += 1, y += stepY) {
    // Every other row is set half a step along, like bricks.
    const offset = (row % 2) * (stepX / 2);
    for (let x = -width; x < width * 2; x += stepX) {
      rows.push(`<text x="${x + offset}" y="${y}">${escapeXml(mark)}</text>`);
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <g transform="rotate(-30 ${width / 2} ${height / 2})" font-family="sans-serif" font-size="${size}"
     fill="${INK}" fill-opacity="0.16" stroke="#ffffff" stroke-opacity="0.16" stroke-width="1">
    ${rows.join("")}
  </g>
</svg>`;
  const jpeg = await sharp(data)
    .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
    .jpeg({ mozjpeg: true, quality: 82 })
    .toBuffer();
  return { height, jpeg, width };
};
