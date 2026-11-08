import { z } from "zod";
import { type Client, unwrap } from "./client";

/** Published-only search across events, Qirtas pieces and documents. */
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

/**
 * The Sunday Paper's issues as sent, newest first: the month ("2026-12") and
 * the Sunday it went out. Written only by the job that sends them, so the
 * archive never lists a month that was not sent (decisions.md).
 */
export const sundayPaperIssues = async (client: Client) =>
  unwrap(
    await client
      .schema("content")
      .from("sunday_paper_issues")
      .select("month, sent_on")
      .order("month", { ascending: false })
  ) ?? [];

const PAGE_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*(\/[a-z0-9]+(-[a-z0-9]+)*)*$/u;

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
