import { createAdminClient } from "@repo/database/admin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { inviteStopEmail, stopTokenUser } from "@/lib/api/email-stop";
import { problem } from "@/lib/api/problem";

export const OPTIONS = preflight;

/** The two mailing topics (decisions.md, Channels and email). */
const topicsSchema = z.object({ news: z.boolean(), paper: z.boolean() });

/** A member's topics, for the no-login preferences page. */
export const GET = async (request: Request) => {
  const headers = corsHeaders(request);
  const userId = stopTokenUser(
    new URL(request.url).searchParams.get("token") ?? ""
  );
  if (!userId) {
    return problem(400, "invalid_token", headers);
  }
  const { data } = await createAdminClient()
    .schema("core")
    .from("profiles")
    .select("mail_paper, mail_news")
    .eq("id", userId)
    .maybeSingle();
  return NextResponse.json(
    { news: data?.mail_news ?? false, paper: data?.mail_paper ?? false },
    { headers }
  );
};

/**
 * A member's optional emails (lib/api/email-stop.ts). Three callers: the
 * preferences page at auibsal.org/emails/stop, saving the two topics
 * (JSON body with `topics`) or stopping everything (no topics); and mail
 * apps' one-click unsubscribe (RFC 8058: a form POST to the
 * List-Unsubscribe address, the token in its query), which stops
 * everything.
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
      return problem(400, "invalid_token", headers);
    }
    const admin = createAdminClient();
    const [{ error }, { error: listError }] = await Promise.all([
      admin
        .schema("membership")
        .from("invitations")
        .delete()
        .eq("email", email),
      // A writer added to the mailing list from the invitation leaves it.
      admin
        .schema("content")
        .from("newsletter_subscribers")
        .update({
          status: "unsubscribed",
          unsubscribed_at: new Date().toISOString(),
        })
        .eq("email", email)
        .neq("status", "unsubscribed"),
    ]);
    return error || listError
      ? problem(500, "failed", headers)
      : NextResponse.json({ ok: true }, { headers });
  }
  const fromQuery = params.get("token");
  const body = fromQuery
    ? null
    : ((await request.json().catch(() => null)) as {
        token?: unknown;
        topics?: unknown;
      } | null);
  const topics = topicsSchema.safeParse(body?.topics);
  const token =
    fromQuery ?? (typeof body?.token === "string" ? body.token : "");
  const userId = stopTokenUser(token);
  if (!userId) {
    return problem(400, "invalid_token", headers);
  }
  const { error } = await createAdminClient()
    .schema("core")
    .from("profiles")
    .update(
      topics.success
        ? { mail_news: topics.data.news, mail_paper: topics.data.paper }
        : { mail_news: false, mail_paper: false, notify_email: false }
    )
    .eq("id", userId);
  if (error) {
    return problem(500, "failed", headers);
  }
  return NextResponse.json({ ok: true }, { headers });
};
