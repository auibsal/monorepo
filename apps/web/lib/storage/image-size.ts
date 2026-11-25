/**
 * An uploaded image's pixel size, read from its header (PNG, JPEG or
 * WebP), with no image library. Used for the register's logos
 * (decisions.md, Partners: at least 600 pixels high, at most six times as
 * wide as high) in the browser and again in the API route. Returns null for
 * anything it can't read.
 */
interface Size {
  readonly height: number;
  readonly width: number;
}

const FOURTEEN_BITS = 2 ** 14;

const ascii = (bytes: Uint8Array, at: number, length: number) =>
  String.fromCharCode(...bytes.subarray(at, at + length));

// PNG: the IHDR chunk's width and height, big-endian, at bytes 16 and 20.
const pngSize = (bytes: Uint8Array, view: DataView): Size | null =>
  bytes.length >= 24 &&
  ascii(bytes, 1, 3) === "PNG" &&
  ascii(bytes, 12, 4) === "IHDR"
    ? { height: view.getUint32(20), width: view.getUint32(16) }
    : null;

// WebP: RIFF…WEBP, then VP8 (lossy), VP8L (lossless) or VP8X (extended).
const webpSize = (bytes: Uint8Array, view: DataView): Size | null => {
  if (
    bytes.length < 30 ||
    ascii(bytes, 0, 4) !== "RIFF" ||
    ascii(bytes, 8, 4) !== "WEBP"
  ) {
    return null;
  }
  const chunk = ascii(bytes, 12, 4);
  if (chunk === "VP8 ") {
    return {
      height: view.getUint16(28, true) % FOURTEEN_BITS,
      width: view.getUint16(26, true) % FOURTEEN_BITS,
    };
  }
  if (chunk === "VP8L") {
    const bits = view.getUint32(21, true);
    return {
      height: (Math.floor(bits / FOURTEEN_BITS) % FOURTEEN_BITS) + 1,
      width: (bits % FOURTEEN_BITS) + 1,
    };
  }
  if (chunk === "VP8X") {
    const three = (at: number) =>
      view.getUint8(at) +
      view.getUint8(at + 1) * 256 +
      view.getUint8(at + 2) * 65_536 +
      1;
    return { height: three(27), width: three(24) };
  }
  return null;
};

// The start-of-frame markers (SOF0–SOF15, less DHT, JPG and DAC).
const isFrame = (marker: number) =>
  marker >= 0xc0 &&
  marker <= 0xcf &&
  marker !== 0xc4 &&
  marker !== 0xc8 &&
  marker !== 0xcc;

// JPEG: the first start-of-frame marker's height and width.
const jpegSize = (bytes: Uint8Array, view: DataView): Size | null => {
  if (
    bytes.length < 4 ||
    view.getUint8(0) !== 0xff ||
    view.getUint8(1) !== 0xd8
  ) {
    return null;
  }
  let at = 2;
  while (at + 9 < bytes.length && view.getUint8(at) === 0xff) {
    if (isFrame(view.getUint8(at + 1))) {
      return { height: view.getUint16(at + 5), width: view.getUint16(at + 7) };
    }
    at += 2 + view.getUint16(at + 2);
  }
  return null;
};

export const imageSize = (bytes: Uint8Array): Size | null => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return pngSize(bytes, view) ?? webpSize(bytes, view) ?? jpegSize(bytes, view);
};

export const imageHeight = (bytes: Uint8Array): number | null =>
  imageSize(bytes)?.height ?? null;

/** The register's rules for an organization's logo (decisions.md, Partners). */
const LOGO_MIN_HEIGHT = 600;
/** A wordmark or a lockup may be wide, up to six times its height. */
const LOGO_MAX_RATIO = 6;

/**
 * What is wrong with a file as an organization's logo, or null: under 600
 * pixels high, wider than six to one, or not an image the site can read.
 */
export const logoProblem = async (
  file: Blob
): Promise<"too_short" | "too_wide" | null> => {
  const head = new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer());
  const size = imageSize(head);
  if (!size || size.height < LOGO_MIN_HEIGHT) {
    return "too_short";
  }
  return size.width > size.height * LOGO_MAX_RATIO ? "too_wide" : null;
};
