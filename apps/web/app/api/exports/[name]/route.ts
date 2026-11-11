import { createAdminClient } from "@repo/database/admin";
import { z } from "zod";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { toCsv } from "@/lib/api/csv";
import { exportsByName } from "@/lib/api/exports";
import { hasPermissionAnywhere } from "@/lib/api/permissions";
import { respond } from "@/lib/api/problem";
import { authenticateRequest } from "@/lib/auth/verify";
import { parseError } from "@/lib/observability/error";
import { log } from "@/lib/observability/log";

export const OPTIONS = preflight;

const params = z.record(z.string().max(64), z.string().max(200));

/** POST /exports/<name>: a CSV of an admin list (apps/web/lib/api/exports.ts). */
export const POST = async (
  request: Request,
  context: { params: Promise<{ name: string }> }
) => {
  const headers = corsHeaders(request);
  const json = respond(headers);

  const { name } = await context.params;
  const definition = Object.hasOwn(exportsByName, name)
    ? exportsByName[name]
    : undefined;
  if (!definition) {
    return json({ error: "unknown_export" }, 404);
  }

  const session = await authenticateRequest(request);
  if (!session) {
    return json({ error: "unauthorized" }, 401);
  }

  const parsed = params.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return json({ error: "invalid_params" }, 400);
  }

  const checks = await Promise.all(
    definition.permissions.map((p) => hasPermissionAnywhere(session, p))
  );
  if (!checks.some(Boolean)) {
    return json({ error: "forbidden" }, 403);
  }

  // A list for Student Life goes out only once a second officer approved
  // this officer's request (governance.request_export); it is spent here.
  if (definition.secondOfficer) {
    const { data: approved } = await createAdminClient()
      .schema("governance")
      .rpc("spend_export", {
        name,
        params: parsed.data,
        who: session.userId,
      });
    if (!approved) {
      return json({ error: "second_officer_required" }, 409);
    }
  }

  try {
    const table = await definition.run(session, parsed.data);
    return new Response(toCsv(table.header, table.rows), {
      headers: {
        ...headers,
        "cache-control": "no-store",
        "content-disposition": `attachment; filename="sal-${name}.csv"`,
        "content-type": "text/csv; charset=utf-8",
      },
      status: 200,
    });
  } catch (error) {
    log.error(`Export ${name} failed: ${parseError(error)}`);
    return json({ error: "export_failed" }, 500);
  }
};
