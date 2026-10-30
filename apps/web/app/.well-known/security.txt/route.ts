import { project } from "@repo/config";

// RFC 9116: where to report a security problem (SAL-PLT-08). Expires a year
// from each build, so a stale file never outlives the policy.
export const dynamic = "force-static";

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export const GET = () =>
  new Response(
    [
      `Contact: mailto:${project.supportEmail}`,
      `Expires: ${new Date(Date.now() + YEAR_MS).toISOString()}`,
      `Policy: ${project.url}/library/security`,
      "Preferred-Languages: en, ar",
      `Canonical: ${project.url}/.well-known/security.txt`,
      "",
    ].join("\n"),
    { headers: { "content-type": "text/plain; charset=utf-8" } }
  );
