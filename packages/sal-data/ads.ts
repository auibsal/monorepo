import { z } from "zod";
import { type Client, unwrap } from "./client";

// Ads in Waraq (journal.ads): the Society's own (events, open calls, joining
// SAL) and sponsors' (partners whose signed memorandum grants advertising).
// auibsal.org shows them to visitors who are not signed in; AdSense fills
// the slots none of them takes.

export const adKinds = ["society", "sponsor"] as const;
export type AdKind = (typeof adKinds)[number];

const AD_URL = /^(https:\/\/|\/)/;

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable();

/** What an ad keeper writes in the Nexus. */
export const adInputSchema = z
  .object({
    action_ar: optional(40),
    action_en: optional(40),
    body_ar: optional(240),
    body_en: optional(240),
    ends_on: z.iso.date().nullable(),
    headline_ar: z.string().trim().max(90),
    headline_en: z.string().trim().max(90),
    image_alt_ar: optional(200),
    image_alt_en: optional(200),
    image_path: z.string().nullable(),
    is_published: z.boolean(),
    kind: z.enum(adKinds),
    partner_id: z.uuid().nullable(),
    starts_on: z.iso.date(),
    url: z.string().trim().max(500).regex(AD_URL, { message: "url" }),
  })
  .refine((ad) => (ad.kind === "sponsor") === (ad.partner_id !== null), {
    message: "partner",
    path: ["partner_id"],
  })
  .refine((ad) => !ad.ends_on || ad.ends_on >= ad.starts_on, {
    message: "dates",
    path: ["ends_on"],
  })
  .refine((ad) => ad.headline_en !== "" || ad.headline_ar !== "", {
    message: "headline",
    path: ["headline_en"],
  })
  .refine(
    (ad) =>
      !ad.image_path || ad.image_alt_en !== null || ad.image_alt_ar !== null,
    { message: "alt", path: ["image_alt_en"] }
  );

export type AdInput = z.input<typeof adInputSchema>;

/** What the Nexus says about a draft that cannot be saved yet. */
export const adProblems = [
  "partner",
  "dates",
  "headline",
  "alt",
  "url",
] as const;
export type AdProblem = (typeof adProblems)[number] | "invalid";

export const adProblem = (message: string): AdProblem =>
  (adProblems as readonly string[]).includes(message)
    ? (message as AdProblem)
    : "invalid";

/** The ads running today, for the public site. */
export const currentAds = async (client: Client) =>
  (unwrap(await client.schema("journal").rpc("current_ads")) ?? []).map(
    (ad) => ({ ...ad, kind: ad.kind as AdKind })
  );

export type CurrentAd = Awaited<ReturnType<typeof currentAds>>[number];

/**
 * The ad for one slot on a page: slots take turns through the running ads,
 * starting from a place that changes with the page, so a reader moving
 * through Waraq sees each of them. Null when there are none (AdSense then).
 */
export const adForSlot = <T>(ads: readonly T[], page: string, slot: number) => {
  if (ads.length === 0) {
    return null;
  }
  let start = 0;
  for (const char of page) {
    start = (start * 31 + (char.codePointAt(0) ?? 0)) % ads.length;
  }
  return ads[(start + slot) % ads.length] ?? null;
};

/** Every ad the signed-in keeper may see (RLS), newest first. */
export const keptAds = async (client: Client) =>
  (
    unwrap(
      await client
        .schema("journal")
        .from("ads")
        .select("*")
        .order("starts_on", { ascending: false })
        .order("created_at", { ascending: false })
    ) ?? []
  ).map((ad) => ({ ...ad, kind: ad.kind as AdKind }));

export type KeptAd = Awaited<ReturnType<typeof keptAds>>[number];
