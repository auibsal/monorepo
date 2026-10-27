import type { Database } from "@repo/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, callApi } from "@/lib/nexus/api";

/** What an IDEA Pass card's QR holds: `IDEA:<member number>:<six digits>`. */
const PASS_CARD = /^IDEA:\d{1,12}:\d{6}$/;

export const isPassCard = (value: string) => PASS_CARD.test(value.trim());

type Scan =
  | {
      full_name_ar: string | null;
      full_name_en: string | null;
      scan: string;
      status: "ok";
    }
  | { status: "not_live" | "not_member" };

class PassScanProblem extends Error {
  readonly status: "not_live" | "not_member";

  constructor(status: PassScanProblem["status"]) {
    super(`IDEA Pass scan: ${status}`);
    this.name = "PassScanProblem";
    this.status = status;
  }
}

/**
 * Checks a scanned Pass with The IDEA (through SAL's API, which holds the
 * secret) and answers the scan the officer's own session then spends.
 */
export const scanPass = async (
  supabase: SupabaseClient<Database>,
  code: string
) => {
  const result = await callApi<Scan>(supabase, "/pass/card", {
    code: code.trim(),
  });
  if (result.status !== "ok") {
    throw new PassScanProblem(result.status);
  }
  return result.scan;
};

/** Why a Pass scan didn't name a member, for the officer. */
export const passProblem = (error: unknown) => {
  if (error instanceof PassScanProblem) {
    return error.status === "not_live" ? "notLive" : "notMember";
  }
  if (error instanceof ApiError && error.code === "rate_limited") {
    return "rateLimited";
  }
  return null;
};
