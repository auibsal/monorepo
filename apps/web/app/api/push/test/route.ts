import { authenticateRequest } from "@repo/auth/verify";
import { createAdminClient } from "@repo/database/admin";
import { pushTest } from "@repo/email/copy";
import { NextResponse } from "next/server";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { pushConfigured, pushToUser } from "@/lib/api/push";
import { site } from "@/lib/api/urls";

export const OPTIONS = preflight;

/** Sends a test notice to the caller's own devices (Profile and privacy). */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = (data: object, status = 200) =>
    NextResponse.json(data, { headers, status });

  const session = await authenticateRequest(request);
  if (!session) {
    return json({ error: "unauthorized" }, 401);
  }
  if (!pushConfigured()) {
    return json({ error: "push_not_configured" }, 503);
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .schema("core")
    .from("profiles")
    .select("locale")
    .eq("id", session.userId)
    .maybeSingle();
  const lang = profile?.locale === "ar" ? "ar" : "en";
  const sent = await pushToUser(admin, session.userId, {
    ...pushTest(lang),
    lang,
    tag: "test",
    url: site(lang, "/account/profile"),
  });
  return json({ sent });
};
