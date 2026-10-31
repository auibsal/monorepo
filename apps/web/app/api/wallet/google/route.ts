import { authenticateRequest } from "@repo/auth/verify";
import { createAdminClient } from "@repo/database/admin";
import { membership } from "@repo/sal-data";
import { NextResponse } from "next/server";
import { corsHeaders, preflight } from "@/lib/api/cors";
import {
  ensureWalletCallback,
  googleWalletLink,
  refreshWalletPass,
  type WalletCard,
  walletConfigured,
  walletPassHeld,
} from "@/lib/api/wallet";

export const OPTIONS = preflight;

const tiers = {
  ar: {
    alumni: "عضو مدى الحياة",
    fellow: "زميل",
    honorary: "زميل فخري",
    member: "عضو",
  },
  en: {
    alumni: "Life Member",
    fellow: "Fellow",
    honorary: "Honorary Fellow",
    member: "Member",
  },
} as const;

/**
 * The member's "Add to Google Wallet" link. The card and its secret are
 * read as the member (membership.my_card under their token), never with
 * the secret key. The pass is recorded (membership.wallet_passes, so it can
 * be retired when the card stops being good), and a pass the member
 * already holds is brought up to date and made active again.
 */
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

export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = (data: object, status = 200) =>
    NextResponse.json(data, { headers, status });

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
  const [card, standing, profile] = await Promise.all([
    membership.myCard(session.supabase).catch(() => null),
    membership.myStatus(session.supabase).catch(() => null),
    session.supabase
      .schema("core")
      .from("profiles")
      .select("full_name_en, full_name_ar, locale")
      .eq("id", session.userId)
      .maybeSingle(),
  ]);
  if (!(card && standing?.is_member && profile.data)) {
    return json({ error: "not_a_member" }, 403);
  }
  if (body.check === true) {
    return json({
      configured: true,
      saved: await syncHeld(session.userId, card.code),
    });
  }
  const locale = profile.data.locale === "ar" ? "ar" : "en";
  const pass: WalletCard = {
    code: card.code,
    fullName:
      (locale === "ar" && profile.data.full_name_ar) ||
      profile.data.full_name_en,
    locale,
    memberSince: standing.member_since
      ? new Intl.DateTimeFormat(locale === "ar" ? "ar-IQ-u-nu-latn" : "en-US", {
          month: "long",
          timeZone: "Asia/Baghdad",
          year: "numeric",
        }).format(new Date(standing.member_since))
      : null,
    number: card.number,
    secret: card.secret,
    tier: tiers[locale][standing.tier ?? "member"],
  };

  const admin = createAdminClient();
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
