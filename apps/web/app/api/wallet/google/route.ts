import { authenticateRequest } from "@repo/auth/verify";
import { membership } from "@repo/sal-data";
import { NextResponse } from "next/server";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { googleWalletLink, walletConfigured } from "@/lib/api/wallet";

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
 * the secret key.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = (data: object, status = 200) =>
    NextResponse.json(data, { headers, status });

  if (!walletConfigured()) {
    return json({ error: "wallet_not_configured" }, 503);
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
  const locale = profile.data.locale === "ar" ? "ar" : "en";
  const url = await googleWalletLink({
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
  });
  return json({ url });
};
