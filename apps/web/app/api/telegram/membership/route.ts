import { createAdminClient } from "@repo/database/admin";
import { env } from "@/env";
import { sharedBot } from "@/lib/api/bot/bot";
import { confirmMembership } from "@/lib/api/bot/membership";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { respond } from "@/lib/api/problem";
import { authenticateRequest } from "@/lib/auth/verify";

export const maxDuration = 10;
export const OPTIONS = preflight;

/**
 * POST /telegram/membership: asks Telegram whether the caller is in the
 * Society's groups and keeps the answer (decisions.md, Where things live:
 * "checked against the thing itself"), so Today's "Join the Diwan group"
 * clears for someone already in it. Each call to Telegram has a short
 * timeout; Today never waits longer.
 */
export const POST = async (request: Request) => {
  const json = respond(corsHeaders(request));
  const session = await authenticateRequest(request);
  if (!session) {
    return json({ error: "unauthorized" }, 401);
  }
  if (!env.TELEGRAM_BOT_TOKEN) {
    return json({ linked: false, groups: [] });
  }
  const admin = createAdminClient();
  const [{ data: account }, { data: groups }] = await Promise.all([
    admin
      .schema("api")
      .from("telegram_accounts")
      .select("telegram_id")
      .eq("user_id", session.userId)
      .maybeSingle(),
    admin.schema("api").from("telegram_groups").select("chat_id, audience"),
  ]);
  if (!account) {
    return json({ linked: false, groups: [] });
  }
  const { api } = sharedBot();
  const answers = await Promise.all(
    (groups ?? []).map(async (group) => ({
      audience: group.audience,
      in: await confirmMembership(api, group.chat_id, account.telegram_id),
    }))
  );
  return json({ groups: answers, linked: true });
};
