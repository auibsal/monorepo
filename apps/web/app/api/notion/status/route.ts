import { env } from "@/env";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { createNotion } from "@/lib/api/notion/client";
import { accessLists, homeUrl, readSyncState } from "@/lib/api/notion/run";
import { hasPermission } from "@/lib/api/permissions";
import { respond } from "@/lib/api/problem";
import { authenticateRequest } from "@/lib/auth/verify";
import { parseError } from "@/lib/observability/error";

export const OPTIONS = preflight;

/**
 * The Notion connection for Administration → Settings: whether it is set
 * up, the last sync, and who to remove from the workspace (who to invite
 * is core.notion_to_invite).
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

  const [state, home] = await Promise.all([readSyncState(), homeUrl()]);
  const base = { home, state };
  if (!env.NOTION_TOKEN) {
    return json({ ...base, configured: false });
  }
  // Who is in the workspace without a role that opens it, for the
  // Secretary to remove (decisions.md, Notion: by named invitation).
  try {
    const { remove } = await accessLists(createNotion(env.NOTION_TOKEN));
    return json({ ...base, configured: true, remove });
  } catch (error) {
    return json({
      ...base,
      configured: true,
      listsError: parseError(error).slice(0, 200),
    });
  }
};
