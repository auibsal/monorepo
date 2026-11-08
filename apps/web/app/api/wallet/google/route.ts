import { createAdminClient } from "@repo/database/admin";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { respond } from "@/lib/api/problem";
import {
  ensureWalletCallback,
  googleWalletLink,
  refreshWalletPass,
  walletCardFrom,
  walletConfigured,
  walletPassHeld,
} from "@/lib/api/wallet";
import { authenticateRequest } from "@/lib/auth/verify";
import { membership } from "@/lib/data";

export const OPTIONS = preflight;

/**
 * "Is it in my Wallet?": asks Google whether the pass is held and records
 * the answer, for when the save callback never came. Unknown (Google not
 * reachable) leaves the record as it was.
 */
const syncHeld = async (userId: string, code: string) => {
  const held = await walletPassHeld(code).catch(() => null);
  if (held === null) {
    return false;
  }
  const admin = createAdminClient();
  const { data: recorded } = await admin
    .schema("membership")
    .from("wallet_passes")
    .select("state")
    .eq("code", code)
    .maybeSingle();
  const state = held ? "saved" : "removed";
  if (!recorded && held) {
    await admin
      .schema("membership")
      .from("wallet_passes")
      .insert({ code, state, user_id: userId });
  } else if (
    recorded &&
    recorded.state !== "expired" &&
    recorded.state !== state &&
    (held || recorded.state === "saved")
  ) {
    await admin
      .schema("membership")
      .from("wallet_passes")
      .update({ event_at: new Date().toISOString(), state })
      .eq("code", code);
  }
  return held;
};

/**
 * The "Add to Google Wallet" link. The card must be the caller's own
 * (membership.my_card under their token); its fields come from
 * membership.wallet_card. The pass is recorded (membership.wallet_passes,
 * so it can be refreshed when the role or class changes and retired when
 * the card stops being good), and a pass already held is brought up to
 * date and made active again.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = respond(headers);

  const body = (await request.json().catch(() => ({}))) as { check?: unknown };
  if (!walletConfigured()) {
    // The card asks first; while Wallet isn't set up it simply hides the
    // button (no failed request on every visit).
    return body.check === true
      ? json({ configured: false, saved: false })
      : json({ error: "wallet_not_configured" }, 503);
  }
  const session = await authenticateRequest(request);
  if (!session) {
    return json({ error: "unauthorized" }, 401);
  }
  // The card is read as its holder first: no card, no pass. Every kind
  // has one, guests' too (decisions §11).
  const card = await membership.myCard(session.supabase).catch(() => null);
  if (!card) {
    return json({ error: "not_a_member" }, 403);
  }
  if (body.check === true) {
    return json({
      configured: true,
      saved: await syncHeld(session.userId, card.code),
    });
  }
  const admin = createAdminClient();
  const { data: row } = await admin
    .schema("membership")
    .rpc("wallet_card", { uid: session.userId })
    .maybeSingle();
  if (!row) {
    return json({ error: "not_a_member" }, 403);
  }
  const pass = walletCardFrom(row);

  const { data: recorded } = await admin
    .schema("membership")
    .from("wallet_passes")
    .select("state")
    .eq("code", card.code)
    .maybeSingle();
  if (!recorded) {
    await admin
      .schema("membership")
      .from("wallet_passes")
      .insert({ code: card.code, user_id: session.userId });
  } else if (recorded.state === "expired") {
    await admin
      .schema("membership")
      .from("wallet_passes")
      .update({ state: "issued" })
      .eq("code", card.code);
  }
  // The link only creates a pass; one already in Google Wallet is updated
  // here. A failure leaves the old pass as it was; the link still works.
  await refreshWalletPass(pass).catch(() => false);
  await ensureWalletCallback().catch(() => undefined);

  return json({ url: await googleWalletLink(pass) });
};
