import { z } from "zod";
import { type Client, unwrap } from "./client";

export type SearchKind = "document" | "event" | "piece";

/** Published-only search across events, Waraq pieces and documents. */
export const search = async (client: Client, query: string, limit = 30) =>
  query.trim().length < 2
    ? []
    : (unwrap(
        await client
          .schema("content")
          .rpc("search", { max_results: limit, query })
      ) ?? []);

export const publicSetting = async (client: Client, key: string) =>
  unwrap(
    await client
      .schema("core")
      .from("settings")
      .select("value")
      .eq("key", key)
      .maybeSingle()
  )?.value ?? null;

// ── Admin (content.manage) ──────────────────────────────────────────────────

/**
 * Homepage slots the public home page reads (apps/web): a line under the
 * hero, and up to three featured items that point at a record.
 */
export const homepageSlotKeys = [
  "hero_note",
  "feature_1",
  "feature_2",
  "feature_3",
] as const;

export const slotRefTypes = [
  "event",
  "piece",
  "issue",
  "campaign",
  "call",
  "page",
] as const;

const PAGE_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*(\/[a-z0-9]+(-[a-z0-9]+)*)*$/;

export const pageSchema = z.object({
  body_ar: z.string().optional(),
  body_en: z.string().optional(),
  slug: z.string().regex(PAGE_SLUG),
  status: z.enum(["draft", "published"]),
  title_ar: z.string().trim().min(1).max(200),
  title_en: z.string().trim().min(1).max(200),
});

export const announcementSchema = z
  .object({
    audience: z.enum(["public", "members"]),
    body_ar: z.string().max(2000).optional(),
    body_en: z.string().max(2000).optional(),
    ends_at: z.iso.datetime({ offset: true }).nullable(),
    is_banner: z.boolean(),
    link: z.url().max(2048).nullable(),
    starts_at: z.iso.datetime({ offset: true }),
    title_ar: z.string().trim().min(1).max(200),
    title_en: z.string().trim().min(1).max(200),
  })
  .refine((a) => !a.is_banner || a.audience === "public", {
    message: "banner_public",
    path: ["is_banner"],
  })
  .refine((a) => !a.ends_at || new Date(a.ends_at) > new Date(a.starts_at), {
    message: "ends_before_start",
    path: ["ends_at"],
  });
