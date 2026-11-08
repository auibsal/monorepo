import { env } from "@/env";
import { hasBearer } from "@/lib/api/bearer";
import { runNotionSync } from "@/lib/api/notion/run";
import { problem } from "@/lib/api/problem";

export const maxDuration = 60;

/**
 * Every five minutes (pg_cron `sal-notion-sync`): the team's Notion
 * workspace. Mirrors officers, programs, the document and minutes registry
 * and Journal counts into Notion, publishes events and news set to Ready to
 * publish there, and writes RSVP counts back. Does nothing without
 * NOTION_TOKEN. `?documents=all` is the Library re-sync (decisions.md): every document row, Published ones included, is rendered again.
 * Run it until the counts show nothing left (each run has 45 seconds).
 */
const sync = async (request: Request) => {
  if (!hasBearer(request, env.CRON_SECRET)) {
    return problem(401, "unauthorized");
  }
  const resyncDocuments =
    new URL(request.url).searchParams.get("documents") === "all";
  return Response.json(await runNotionSync(undefined, { resyncDocuments }));
};

export const GET = sync;
export const POST = sync;
