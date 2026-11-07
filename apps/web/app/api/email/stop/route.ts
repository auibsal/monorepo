import { createAdminClient } from "@repo/database/admin";
import { NextResponse } from "next/server";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { inviteStopEmail, stopTokenUser } from "@/lib/api/email-stop";

export const OPTIONS = preflight;

/**
 * Stops a member's optional emails (lib/api/email-stop.ts). Two callers:
 * the button on auibsal.org/emails/stop (JSON body), and mail apps'
 * one-click unsubscribe (RFC 8058: a form POST to the List-Unsubscribe
 * address, the token in its query).
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const params = new URL(request.url).searchParams;
  const invite =
    params.get("invite") ??
    (
      (await request
        .clone()
        .json()
        .catch(() => null)) as { invite?: unknown } | null
    )?.invite;
  if (typeof invite === "string") {
    // The one-time invitation's stop link: off the list for good.
    const email = inviteStopEmail(invite);
    if (!email) {
      return NextResponse.json(
        { error: "invalid_token" },
        { headers, status: 400 }
      );
    }
    const { error } = await createAdminClient()
      .schema("membership")
      .from("invitations")
      .delete()
      .eq("email", email);
    return error
      ? NextResponse.json({ error: "failed" }, { headers, status: 500 })
      : NextResponse.json({ ok: true }, { headers });
  }
  const fromQuery = params.get("token");
  const body = fromQuery
    ? null
    : ((await request.json().catch(() => null)) as { token?: unknown } | null);
  const token =
    fromQuery ?? (typeof body?.token === "string" ? body.token : "");
  const userId = stopTokenUser(token);
  if (!userId) {
    return NextResponse.json(
      { error: "invalid_token" },
      { headers, status: 400 }
    );
  }
  const { error } = await createAdminClient()
    .schema("core")
    .from("profiles")
    .update({ notify_email: false })
    .eq("id", userId);
  if (error) {
    return NextResponse.json({ error: "failed" }, { headers, status: 500 });
  }
  return NextResponse.json({ ok: true }, { headers });
};
