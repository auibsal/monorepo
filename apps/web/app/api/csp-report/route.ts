import { violationsIn } from "@/lib/api/csp-report";
import { withinRateLimit } from "@/lib/api/rate-limit";
import { log } from "@/lib/observability/log";

/** Reports larger than this are not reports. */
const MAX_BYTES = 16_384;

/**
 * What the Content Security Policy blocked, as browsers report it
 * (`report-to` and `report-uri` in lib/security/csp.ts): one line each in
 * the Vercel runtime log, so a script the policy stops in production is
 * seen. Only addresses without their queries are kept; nothing about the
 * visitor. Always 204: a browser does nothing with the answer.
 */
export const POST = async (request: Request): Promise<Response> => {
  const done = new Response(null, { status: 204 });
  const raw = await request.text().catch(() => "");
  if (!raw || raw.length > MAX_BYTES) {
    return done;
  }
  if (!(await withinRateLimit(request, "csp-report", { max: 20 }))) {
    return done;
  }
  let payload: unknown = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    return done;
  }
  for (const found of violationsIn(payload)) {
    log.warn("Content Security Policy blocked", { ...found });
  }
  return done;
};
