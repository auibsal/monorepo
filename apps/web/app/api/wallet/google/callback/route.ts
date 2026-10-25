import { createAdminClient } from "@repo/database/admin";
import { NextResponse } from "next/server";
import { env } from "@/env";
import {
  walletClassId,
  walletCodeOf,
  walletConfigured,
} from "@/lib/api/wallet";
import { openWalletMessage, walletRootKeys } from "@/lib/api/wallet-callback";

/**
 * Google Wallet tells us when a member saves or removes their pass. The
 * message is signed by Google (lib/api/wallet-callback.ts); anything that
 * doesn't verify is refused. The pass's state is kept in
 * membership.wallet_passes, so the card can say it is in their Wallet.
 */
export const POST = async (request: Request) => {
  if (!walletConfigured()) {
    return NextResponse.json(
      { error: "wallet_not_configured" },
      { status: 503 }
    );
  }
  const event = await openWalletMessage(await request.text(), {
    issuerId: env.GOOGLE_WALLET_ISSUER_ID ?? "",
    rootKeys: await walletRootKeys(),
  });
  if (!event) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }
  const code = walletCodeOf(event.objectId);
  if (event.classId !== walletClassId() || !code) {
    // Another class of this issuer: nothing of ours.
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();
  const at = new Date(event.expTimeMillis).toISOString();
  const state = event.eventType === "save" ? "saved" : "removed";
  const { data: pass } = await admin
    .schema("membership")
    .from("wallet_passes")
    .select("state, event_at")
    .eq("code", code)
    .maybeSingle();

  if (pass) {
    // A late delivery never undoes a newer message, and an expired pass
    // stays expired until the member adds it again.
    const newer =
      pass.event_at && new Date(pass.event_at).getTime() >= event.expTimeMillis;
    if (pass.state === "expired" || newer) {
      return NextResponse.json({ ok: true });
    }
    await admin
      .schema("membership")
      .from("wallet_passes")
      .update({ event_at: at, state })
      .eq("code", code);
    return NextResponse.json({ ok: true });
  }

  // A pass issued before the site kept track: only a current card counts.
  const { data: card } = await admin
    .schema("membership")
    .from("cards")
    .select("user_id")
    .eq("code", code)
    .maybeSingle();
  if (card) {
    await admin
      .schema("membership")
      .from("wallet_passes")
      .insert({ code, event_at: at, state, user_id: card.user_id });
  }
  return NextResponse.json({ ok: true });
};
