import { env } from "@/env";

const publicObject = (bucket: string, path: string | null | undefined) =>
  path && env.NEXT_PUBLIC_SUPABASE_URL
    ? `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path
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
