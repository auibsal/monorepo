import { env } from "@/env";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { createNotion } from "@/lib/api/notion/client";
import {
  accessLists,
  catchUpSentAt,
  homeUrl,
  inviteLink,
  readSyncState,
} from "@/lib/api/notion/run";
import { hasPermission } from "@/lib/api/permissions";
import { respond } from "@/lib/api/problem";
import { authenticateRequest } from "@/lib/auth/verify";
import { parseError } from "@/lib/observability/error";

export const OPTIONS = preflight;

/**
 * The Notion connection for Administration → Settings: whether it is set
 * up, the last sync, and who to invite to or remove from the workspace.
 * Settings managers and role assigners only.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = respond(headers);

  const session = await authenticateRequest(request);
  if (!session) {
    return json({ error: "unauthorized" }, 401);
  }
  const [settings, roles] = await Promise.all([
    hasPermission(session, "settings.manage"),
    hasPermission(session, "roles.assign"),
  ]);
  if (!(settings || roles)) {
    return json({ error: "forbidden" }, 403);
  }

  const [state, home, invite, sentAt] = await Promise.all([
    readSyncState(),
    homeUrl(),
    inviteLink(),
    catchUpSentAt(),
  ]);
  const base = { catchUpSentAt: sentAt, home, inviteLink: invite, state };
  if (!env.NOTION_TOKEN) {
    return json({ ...base, configured: false });
  }
  // Once the catch-up has gone out, the lists are no longer shown: the
  // invitation comes with each role from then on.
  if (sentAt) {
    return json({ ...base, configured: true });
  }
  try {
    const lists = await accessLists(createNotion(env.NOTION_TOKEN));
    return json({ ...base, configured: true, ...lists });
  } catch (error) {
    return json({
      ...base,
      configured: true,
      listsError: parseError(error).slice(0, 200),
    });
  }
};
