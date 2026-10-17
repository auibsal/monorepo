import { project } from "@repo/config";
import { endpoints, signIn } from "@/lib/endpoints";
import { json, preflight } from "@/lib/v1";

export const OPTIONS = preflight;

/** GET /v1: what this API offers. The reference is at api.auibsal.org. */
export const GET = () =>
  json({
    docs: `${project.hosts.api}/reference`,
    endpoints: endpoints.map((e) => `${e.method} ${e.path}`),
    name: `${project.name} API`,
    signIn,
    version: "1",
  });
