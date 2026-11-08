import { createHmac, timingSafeEqual } from "node:crypto";
import { log } from "@repo/observability/log";
import { after } from "next/server";
import { env } from "@/env";
import { runNotionSync } from "@/lib/api/notion/run";
import { problem } from "@/lib/api/problem";
import { withinRateLimit } from "@/lib/api/rate-limit";

export const maxDuration = 60;

/** Whether `X-Notion-Signature` is Notion's HMAC of the body with our token. */
const signedByNotion = (body: string, header: string | null) => {
  const secret = env.NOTION_WEBHOOK_SECRET;
  if (!(secret && header)) {
    return false;
  }
  const expected = Buffer.from(
    `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`
  );
  const received = Buffer.from(header);
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
};

/** The token in Notion's first call, which verifies the subscription. */
const verificationToken = (body: string): unknown => {
  try {
    return (JSON.parse(body) as { verification_token?: unknown })
      .verification_token;
  } catch {
    return null;
  }
};

/**
 * POST /api/hooks/notion: Notion tells the site that a page changed, so an
 * event or a document set to publish reaches the site within a minute
 * instead of at the next 15-minute sync (which stays, as the reconcile).
 * The first call carries the verification token to paste into Notion and
 * NOTION_WEBHOOK_SECRET; every later one is signed with it. A burst of
 * changes starts one sync a minute at most.
 */
export const POST = async (request: Request) => {
  const body = await request.text();
  if (!env.NOTION_WEBHOOK_SECRET) {
    const token = verificationToken(body);
    if (typeof token === "string") {
      log.info(
        `Notion webhook verification token (paste it into Notion and set NOTION_WEBHOOK_SECRET): ${token}`
      );
      return new Response(null, { status: 204 });
    }
    return problem(503, "not_configured");
  }
  if (!signedByNotion(body, request.headers.get("x-notion-signature"))) {
    return problem(401, "invalid_signature");
  }
  const fresh = await withinRateLimit(request, "notion-webhook", {
    key: "notion",
    max: 1,
    windowSeconds: 60,
  });
  if (fresh) {
    // Answer Notion at once; the sync runs after the response.
    after(async () => {
      const state = await runNotionSync();
      if ("problems" in state && state.problems.length > 0) {
        log.warn(`Notion sync (webhook): ${state.problems.join("; ")}`);
      }
    });
  }
  return new Response(null, { status: 204 });
};
