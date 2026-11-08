import { revalidateTag } from "next/cache";
import { env } from "@/env";
import { hasBearer } from "@/lib/api/bearer";
import { problem } from "@/lib/api/problem";
import { cacheTags } from "@/lib/supabase";

/**
 * POST { tags: ["events", …] } with `Authorization: Bearer <REVALIDATE_SECRET>`.
 * Called by the API routes when publish-relevant rows change.
 */
export const POST = async (request: Request) => {
  if (!hasBearer(request, env.REVALIDATE_SECRET)) {
    return problem(401, "unauthorized");
  }

  const body = (await request.json().catch(() => ({}))) as { tags?: unknown };
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((tag): tag is (typeof cacheTags)[number] =>
        (cacheTags as readonly unknown[]).includes(tag)
      )
    : [];

  for (const tag of tags) {
    revalidateTag(tag, "max");
  }

  return Response.json({ revalidated: tags });
};
