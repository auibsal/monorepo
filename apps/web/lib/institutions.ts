import type { Client } from "@/lib/data/client";

/**
 * AUIB's own offices, listed under "With the support of" on the partners
 * page only (decisions §2): they support the Society but aren't partners.
 * Partnerships keeps the list in the Diwan (governance.supporters). Logos
 * are AUIB's standard set in apps/web/public/institutions (packages/brand/
 * guide/02-logo.md): `<logo>.svg` in color for paper, `<logo>-white.svg`
 * for ink, each 325 high.
 */
export const SUPPORTER_LOGOS = [
  "auib",
  "student-life",
  "cas",
  "press",
  "library",
] as const;

export const shownSupporters = async (client: Client) => {
  const { data } = await client
    .schema("governance")
    .from("supporters")
    .select("id, name_en, name_ar, url, logo, logo_width")
    .eq("shown", true)
    .order("sort")
    .order("name_en");
  return data ?? [];
};
