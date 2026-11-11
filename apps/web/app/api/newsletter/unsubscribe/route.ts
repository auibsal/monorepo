import { createAdminClient } from "@repo/database/admin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { problem } from "@/lib/api/problem";

export const OPTIONS = preflight;

const TOKEN = /^[0-9a-f]{32,128}$/u;

const topicsSchema = z.object({ news: z.boolean(), paper: z.boolean() });

/** A reader's topics, for the no-login preferences page. */
export const GET = async (request: Request) => {
  const headers = corsHeaders(request);
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!TOKEN.test(token)) {
    return problem(400, "invalid_token", headers);
  }
  const { data } = await createAdminClient()
    .schema("content")
    .from("newsletter_subscribers")
    .select("paper, news, status")
    .eq("unsubscribe_token", token)
    .maybeSingle();
  const on = data?.status === "subscribed";
  return NextResponse.json(
    { news: on && (data?.news ?? false), paper: on && (data?.paper ?? false) },
    { headers }
  );
};

/**
 * Leaves the newsletter, or changes its topics (a JSON body with
 * `topics`; with neither topic it is leaving). Two callers: the button on
 * auibsal.org/sunday-paper/unsubscribe (JSON body), and mail apps' one-click
 * unsubscribe (RFC 8058: a form POST to the List-Unsubscribe address, the
 * token in its query). The answer is the same for an unknown token.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const fromQuery = new URL(request.url).searchParams.get("token");
  const body = fromQuery
    ? null
    : ((await request.json().catch(() => null)) as {
        token?: unknown;
        topics?: unknown;
      } | null);
  const topics = topicsSchema.safeParse(body?.topics);
  const token =
    fromQuery ?? (typeof body?.token === "string" ? body.token : "");
  if (!TOKEN.test(token)) {
    return problem(400, "invalid_token", headers);
  }
  const table = createAdminClient()
    .schema("content")
    .from("newsletter_subscribers");
  // Changing topics keeps a confirmed reader on the list; with none left,
  // or from the one-click link, they leave it.
  const { error } =
    topics.success && (topics.data.paper || topics.data.news)
      ? await table
          .update({ news: topics.data.news, paper: topics.data.paper })
          .eq("unsubscribe_token", token)
          .eq("status", "subscribed")
      : await table
          .update({
            confirm_token: null,
            status: "unsubscribed",
            unsubscribed_at: new Date().toISOString(),
          })
          .eq("unsubscribe_token", token)
          .neq("status", "unsubscribed");
  if (error) {
    return problem(500, "failed", headers);
  }
  return NextResponse.json({ ok: true }, { headers });
};
