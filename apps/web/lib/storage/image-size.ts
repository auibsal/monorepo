/**
 * An uploaded image's pixel height, read from its header (PNG, JPEG or
 * WebP), with no image library. Used for the register's logos
 * (decisions.md, Partners: at least 600 pixels high) in the browser and
 * again in the API route. Returns null for anything it can't read.
 */
const FOURTEEN_BITS = 2 ** 14;

const ascii = (bytes: Uint8Array, at: number, length: number) =>
  String.fromCharCode(...bytes.subarray(at, at + length));

// PNG: the IHDR chunk's height, big-endian, at byte 20.
const pngHeight = (bytes: Uint8Array, view: DataView) =>
  bytes.length >= 24 &&
  ascii(bytes, 1, 3) === "PNG" &&
  ascii(bytes, 12, 4) === "IHDR"
    ? view.getUint32(20)
    : null;

// WebP: RIFF…WEBP, then VP8 (lossy), VP8L (lossless) or VP8X (extended).
const webpHeight = (bytes: Uint8Array, view: DataView) => {
  if (
    bytes.length < 30 ||
    ascii(bytes, 0, 4) !== "RIFF" ||
    ascii(bytes, 8, 4) !== "WEBP"
  ) {
    return null;
  }
  const chunk = ascii(bytes, 12, 4);
  if (chunk === "VP8 ") {
    return view.getUint16(28, true) % FOURTEEN_BITS;
  }
  if (chunk === "VP8L") {
    const bits = view.getUint32(21, true);
    return (Math.floor(bits / FOURTEEN_BITS) % FOURTEEN_BITS) + 1;
  }
  if (chunk === "VP8X") {
    return (
      view.getUint8(27) +
      view.getUint8(28) * 256 +
      view.getUint8(29) * 65_536 +
      1
    );
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

// JPEG: the first start-of-frame marker's height.
const jpegHeight = (bytes: Uint8Array, view: DataView) => {
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
      return view.getUint16(at + 5);
    }
    at += 2 + view.getUint16(at + 2);
  }
  return null;
};

export const imageHeight = (bytes: Uint8Array): number | null => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return (
    pngHeight(bytes, view) ?? webpHeight(bytes, view) ?? jpegHeight(bytes, view)
  );
};

/** The register's rule for an organization's logo (decisions.md, Partners). */
const LOGO_MIN_HEIGHT = 600;

/** Whether a file is tall enough to be an organization's logo. */
export const logoTallEnough = async (file: Blob) => {
  const head = new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer());
  const height = imageHeight(head);
  return height !== null && height >= LOGO_MIN_HEIGHT;
};
