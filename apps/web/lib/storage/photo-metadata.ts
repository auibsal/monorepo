/**
 * What a photo carries (decisions.md, Media: Content Credentials): its
 * location, which the site refuses, and Content Credentials (C2PA), which
 * it records and links to verify. Read from the original's bytes, never
 * changed: the original is kept byte for byte, and AVIF and WebP are
 * display copies only.
 */

const GPS_IFD_POINTER = 0x88_25;
const GPS_LATITUDE = 0x00_02;
const GPS_LONGITUDE = 0x00_04;
const TIFF_START = 6; // after "Exif\0\0"

const ascii = (bytes: Uint8Array, at: number, length: number) =>
  String.fromCharCode(...bytes.subarray(at, at + length));

/** A TIFF block (EXIF) has a GPS position: the GPS IFD names one. */
const tiffHasGps = (tiff: Uint8Array) => {
  if (tiff.length < 8) {
    return false;
  }
  const order = ascii(tiff, 0, 2);
  if (order !== "II" && order !== "MM") {
    return false;
  }
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  const little = order === "II";
  const u16 = (at: number) =>
    at + 2 <= tiff.length ? view.getUint16(at, little) : 0;
  const u32 = (at: number) =>
    at + 4 <= tiff.length ? view.getUint32(at, little) : 0;
  const entries = (ifd: number) => {
    const count = u16(ifd);
    return Array.from({ length: count }, (_, i) => ({
      tag: u16(ifd + 2 + i * 12),
      value: u32(ifd + 2 + i * 12 + 8),
    }));
  };
  const pointer = entries(u32(4)).find((e) => e.tag === GPS_IFD_POINTER);
  if (!pointer || pointer.value === 0 || pointer.value >= tiff.length) {
    return false;
  }
  return entries(pointer.value).some(
    (e) => e.tag === GPS_LATITUDE || e.tag === GPS_LONGITUDE
  );
};

const isJpeg = (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8;
const isPng = (b: Uint8Array) => ascii(b, 1, 3) === "PNG";
const isWebp = (b: Uint8Array) =>
  ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP";

interface Segment {
  readonly data: Uint8Array;
  readonly kind: string;
}

/** A JPEG's marker segments up to the image data. */
const jpegSegments = (b: Uint8Array): Segment[] => {
  const out: Segment[] = [];
  let at = 2;
  while (at + 4 <= b.length && b[at] === 0xff) {
    const marker = b[at + 1] ?? 0;
    // Start of scan: the image data follows.
    if (marker === 0xda) {
      break;
    }
    const length = (b[at + 2] ?? 0) * 256 + (b[at + 3] ?? 0);
    out.push({
      data: b.subarray(at + 4, at + 2 + length),
      kind: `APP${marker - 0xe0}`,
    });
    at += 2 + length;
  }
  return out;
};

/** A PNG's chunks, by type. */
const pngChunks = (b: Uint8Array): Segment[] => {
  const out: Segment[] = [];
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let at = 8;
  while (at + 8 <= b.length) {
    const length = view.getUint32(at);
    out.push({
      data: b.subarray(at + 8, at + 8 + length),
      kind: ascii(b, at + 4, 4),
    });
    at += 12 + length;
  }
  return out;
};

/** A WebP's chunks, by FourCC. */
const webpChunks = (b: Uint8Array): Segment[] => {
  const out: Segment[] = [];
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let at = 12;
  while (at + 8 <= b.length) {
    const length = view.getUint32(at + 4, true);
    out.push({
      data: b.subarray(at + 8, at + 8 + length),
      kind: ascii(b, at, 4),
    });
    at += 8 + length + (length % 2);
  }
  return out;
};

const contains = (data: Uint8Array, text: string) => {
  const needle = Array.from(text, (c) => c.charCodeAt(0));
  for (let i = 0; i + needle.length <= data.length; i += 1) {
    if (needle.every((n, j) => data[i + j] === n)) {
      return true;
    }
  }
  return false;
};

/** The photo carries where it was taken. */
export const hasLocation = (bytes: Uint8Array) => {
  if (isJpeg(bytes)) {
    return jpegSegments(bytes).some(
      (s) =>
        s.kind === "APP1" &&
        ascii(s.data, 0, 4) === "Exif" &&
        tiffHasGps(s.data.subarray(TIFF_START))
    );
  }
  if (isPng(bytes)) {
    return pngChunks(bytes).some(
      (s) => s.kind === "eXIf" && tiffHasGps(s.data)
    );
  }
  if (isWebp(bytes)) {
    return webpChunks(bytes).some((s) => {
      if (s.kind !== "EXIF") {
        return false;
      }
      // Some writers keep the "Exif\0\0" prefix inside the chunk.
      return ascii(s.data, 0, 4) === "Exif"
        ? tiffHasGps(s.data.subarray(TIFF_START))
        : tiffHasGps(s.data);
    });
  }
  return false;
};

/**
 * The photo carries Content Credentials: a C2PA manifest store, in JPEG's
 * APP11 JUMBF boxes, PNG's caBX chunk or WebP's C2PA chunk.
 */
export const hasContentCredentials = (bytes: Uint8Array) => {
  if (isJpeg(bytes)) {
    return jpegSegments(bytes).some(
      (s) => s.kind === "APP11" && contains(s.data, "c2pa")
    );
  }
  if (isPng(bytes)) {
    return pngChunks(bytes).some((s) => s.kind === "caBX");
  }
  if (isWebp(bytes)) {
    return webpChunks(bytes).some((s) => s.kind === "C2PA");
  }
  return false;
};

/** Content Credentials' own page that verifies a photo at an address. */
export const verifyCredentialsUrl = (photoUrl: string) =>
  `https://contentcredentials.org/verify?source=${encodeURIComponent(photoUrl)}`;
