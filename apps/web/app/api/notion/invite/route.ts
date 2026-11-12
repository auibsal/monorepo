import { createAdminClient } from "@repo/database/admin";
import { env } from "@/env";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { createNotion } from "@/lib/api/notion/client";
import { accessLists, catchUpSentAt, inviteLink } from "@/lib/api/notion/run";
import { hasPermission } from "@/lib/api/permissions";
import { respond } from "@/lib/api/problem";
import { authenticateRequest } from "@/lib/auth/verify";
import { parseError } from "@/lib/observability/error";
import { log } from "@/lib/observability/log";

export const OPTIONS = preflight;

/**
 * The one-time Notion catch-up: the workspace's invitation, by email, to
 * every holder of a role that opens Notion who is not yet in it. Sent
 * once (`notion.catch_up_sent_at`); from then on the invitation comes with
 * the role email. Role assigners only.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = respond(headers);

  const session = await authenticateRequest(request);
  if (!session) {
    return json({ error: "unauthorized" }, 401);
  }
  if (!(await hasPermission(session, "roles.assign"))) {
    return json({ error: "forbidden" }, 403);
  }
  if (!env.NOTION_TOKEN) {
    return json({ error: "not_configured" }, 409);
  }
  const [link, sentAt] = await Promise.all([inviteLink(), catchUpSentAt()]);
  if (!link) {
    return json({ error: "no_invite_link" }, 409);
  }
  if (sentAt) {
    return json({ error: "already_sent", sentAt }, 409);
  }
  try {
    const { invite } = await accessLists(createNotion(env.NOTION_TOKEN));
    const admin = createAdminClient();
    if (invite.length > 0) {
      const { error } = await admin
        .schema("core")
        .from("outbox")
        .insert(
          invite.map((i) => ({
            kind: "notion.invite",
            payload: { user_id: i.user_id },
          }))
        );
      if (error) {
        throw error;
      }
    }
    const now = new Date().toISOString();
    const { error } = await admin
      .schema("core")
      .from("settings")
      .update({ updated_by: session.userId, value: now })
      .eq("key", "notion.catch_up_sent_at");
    if (error) {
      throw error;
    }
    log.info(`Notion invitations queued: ${invite.length}`);
    return json({ ok: true, sent: invite.length, sentAt: now });
  } catch (error) {
    log.error(`Notion invitations failed: ${parseError(error)}`);
    return json({ error: "invite_failed" }, 500);
  }
};
