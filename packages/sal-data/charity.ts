import { Constants } from "@repo/database";
import { z } from "zod";
import { type Client, unwrap } from "./client";

export const ledgerSources = Constants.charity.Enums.source;

export const ledgerEntrySchema = z
  .object({
    amount_iqd: z.number().int().positive().max(1_000_000_000),
    campaign_id: z.uuid(),
    counted_by: z.uuid(),
    counted_with: z.uuid(),
    note: z.string().max(1000).optional(),
    occurred_on: z.iso.date(),
    source: z.enum(ledgerSources),
  })
  .refine((e) => e.counted_by !== e.counted_with, {
    message: "two_counters",
    path: ["counted_with"],
  });

export type LedgerEntryInput = z.infer<typeof ledgerEntrySchema>;

export interface CampaignProgress {
  campaign_id: string;
  counted_iqd: number;
  pending_iqd: number;
}

/** Counted (signed-off) totals, and what waits for a sign-off. */
export const campaignProgress = async (client: Client, campaignId?: string) =>
  (unwrap(
    await client
      .schema("charity")
      .rpc("campaign_progress", { campaign_id: campaignId })
  ) ?? []) as CampaignProgress[];

export const activeCampaigns = async (client: Client) =>
  unwrap(
    await client
      .schema("charity")
      .from("campaigns")
      .select("*")
      .eq("status", "active")
      .order("starts_on", { ascending: false })
  );

/** Receipts the campaign has made public (files through the API routes). */
export const publicReceipts = async (client: Client, campaignId: string) =>
  unwrap(
    await client
      .schema("charity")
      .from("receipts")
      .select("id, description_en, description_ar, amount_iqd, created_at")
      .eq("campaign_id", campaignId)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
  ) ?? [];

/** A campaign by its address, unless it is a draft (Row Level Security). */
export const campaignBySlug = async (client: Client, slug: string) =>
  unwrap(
    await client
      .schema("charity")
      .from("campaigns")
      .select("*")
      .eq("slug", slug)
      .neq("status", "draft")
      .maybeSingle()
  );

/** Published impact figures, in order. */
export const impactMetrics = async (client: Client, campaignId: string) =>
  unwrap(
    await client
      .schema("charity")
      .from("impact_metrics")
      .select(
        "id, label_en, label_ar, value, unit_en, unit_ar, report_en, report_ar"
      )
      .eq("campaign_id", campaignId)
      .not("published_at", "is", null)
      .order("sort")
  ) ?? [];

// ── Stages (owner, Nov 4, 2026) ─────────────────────────────────────────────

export const stageKeys = [
  "boxes",
  "donations",
  "fair",
  "handover",
  "impact",
] as const;
export type StageKey = (typeof stageKeys)[number];
export type StageState = "ahead" | "now" | "done";

export interface Stage {
  readonly from: string | null;
  readonly key: StageKey;
  readonly state: StageState;
  readonly to: string | null;
}

export interface StageFields {
  readonly boxes_on: string | null;
  readonly donations_ends_on: string | null;
  readonly donations_starts_on: string | null;
  readonly fair_ends_on: string | null;
  readonly fair_starts_on: string | null;
  readonly handed_over_on: string | null;
  readonly handover_due_on: string | null;
  readonly impact_due_on: string | null;
}

const byDates = (
  from: string | null,
  to: string | null,
  today: string
): StageState => {
  if (!from) {
    return "ahead";
  }
  if ((to ?? from) < today) {
    return "done";
  }
  return from <= today ? "now" : "ahead";
};

/** Reached on the record, else "now" from its day on, never done by date. */
const byRecord = (done: boolean, due: string | null, today: string) => {
  if (done) {
    return "done";
  }
  return due && due <= today ? "now" : "ahead";
};

/**
 * Where the collection stands, from the campaign's record alone: the boxes,
 * donations and fair by their days; the handover only once it is recorded;
 * the impact report only once a figure is published. A recorded handover
 * closes every stage before it. `today` is Baghdad's "YYYY-MM-DD".
 */
export const campaignStages = (
  c: StageFields,
  today: string,
  impactPublished: boolean
): Stage[] => {
  const handedOver = Boolean(c.handed_over_on);
  const stages: Stage[] = [
    {
      from: c.boxes_on,
      key: "boxes",
      state: byDates(c.boxes_on, c.boxes_on, today),
      to: null,
    },
    {
      from: c.donations_starts_on,
      key: "donations",
      state: byDates(c.donations_starts_on, c.donations_ends_on, today),
      to: c.donations_ends_on,
    },
    {
      from: c.fair_starts_on,
      key: "fair",
      state: byDates(c.fair_starts_on, c.fair_ends_on, today),
      to: c.fair_ends_on,
    },
    {
      from: c.handed_over_on ?? c.handover_due_on,
      key: "handover",
      state: byRecord(handedOver, c.handover_due_on, today),
      to: null,
    },
    {
      from: c.impact_due_on,
      key: "impact",
      state: byRecord(impactPublished, c.impact_due_on, today),
      to: null,
    },
  ];
  return handedOver
    ? stages.map((s) =>
        s.key === "handover" || s.key === "impact" ? s : { ...s, state: "done" }
      )
    : stages;
};

export interface DropOffPoint {
  readonly hours_ar?: string;
  readonly hours_en?: string;
  readonly place_ar: string;
  readonly place_en: string;
}

/** The campaign's drop-off points, as stored (checked by the database). */
export const dropOffPoints = (value: unknown): DropOffPoint[] =>
  Array.isArray(value)
    ? value.filter(
        (p): p is DropOffPoint =>
          typeof p === "object" &&
          p !== null &&
          typeof (p as DropOffPoint).place_en === "string" &&
          typeof (p as DropOffPoint).place_ar === "string"
      )
    : [];
