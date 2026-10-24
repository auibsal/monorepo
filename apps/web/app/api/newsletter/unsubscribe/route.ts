import { createAdminClient } from "@repo/database/admin";
import { NextResponse } from "next/server";
import { corsHeaders, preflight } from "@/lib/api/cors";

export const OPTIONS = preflight;

const TOKEN = /^[0-9a-f]{32,128}$/;

/**
 * Leaves the newsletter. Two callers: the button on
 * auibsal.org/newsletter/unsubscribe (JSON body), and mail apps' one-click
 * unsubscribe (RFC 8058: a form POST to the List-Unsubscribe address, the
 * token in its query). The answer is the same for an unknown token.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const fromQuery = new URL(request.url).searchParams.get("token");
  const body = fromQuery
    ? null
    : ((await request.json().catch(() => null)) as { token?: unknown } | null);
  const token =
    fromQuery ?? (typeof body?.token === "string" ? body.token : "");
  if (!TOKEN.test(token)) {
    return NextResponse.json(
      { error: "invalid_token" },
      { headers, status: 400 }
    );
  }
  const { error } = await createAdminClient()
    .schema("content")
    .from("newsletter_subscribers")
    .update({
      confirm_token: null,
      status: "unsubscribed",
      unsubscribed_at: new Date().toISOString(),
    })
    .eq("unsubscribe_token", token)
    .neq("status", "unsubscribed");
  if (error) {
    return NextResponse.json({ error: "failed" }, { headers, status: 500 });
  }
  return NextResponse.json({ ok: true }, { headers });
};
