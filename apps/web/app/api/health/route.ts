import { createAdminClient } from "@repo/database/admin";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Whether the site can reach its database, and which commit is running
 * (audit E4). A light read of the settings table; never cached. 503 when
 * the database doesn't answer.
 */
export const GET = async (): Promise<Response> => {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA ?? null;
  try {
    const { error } = await createAdminClient()
      .schema("core")
      .from("settings")
      .select("key", { count: "exact", head: true })
      .limit(1);
    if (error) {
      throw error;
    }
    return Response.json({ commit, database: "ok" }, { headers: NO_STORE });
  } catch {
    return Response.json(
      { commit, database: "unreachable" },
      { headers: NO_STORE, status: 503 }
    );
  }
};
