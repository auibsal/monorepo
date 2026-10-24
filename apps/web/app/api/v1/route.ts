import { project } from "@repo/config";
import { endpoints, signIn } from "@/lib/api/endpoints";
import { json, preflight } from "@/lib/api/v1";

export const OPTIONS = preflight;

/** GET /api/v1: what this API offers. The reference is at /developers. */
export const GET = () =>
  json({
    docs: `${project.url}/developers/reference`,
    endpoints: endpoints.map((e) => `${e.method} ${e.path}`),
    name: `${project.name} API`,
    signIn,
    version: "1",
  });
