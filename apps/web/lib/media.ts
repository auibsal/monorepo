// The public URL only, read directly: this module reaches client components
// too (the Diwan's register shows logos), and `@/env` would carry the
// server keys' names into the browser bundle (CI greps for them).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

const publicObject = (bucket: string, path: string | null | undefined) =>
  path && SUPABASE_URL
    ? `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`
    : null;

/** Public URL of an object in the media bucket (published images only). */
export const mediaUrl = (path: string | null | undefined) =>
  publicObject("media", path);

/** Public URL of a piece's reading (design review A11). */
export const readingUrl = (path: string | null | undefined) =>
  publicObject("readings", path);
