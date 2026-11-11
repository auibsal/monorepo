import { project } from "@repo/config";
import { cacheLife } from "next/cache";

// RFC 9116: where to report a security problem (the Terms). Expires a year
// from when it was made, and it is made again each week, so a stale file
// never outlives the policy.
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

const expires = async () => {
  "use cache";
  cacheLife("weeks");
  return await Promise.resolve(new Date(Date.now() + YEAR_MS).toISOString());
};

export const GET = async () =>
  new Response(
    [
      `Contact: mailto:${project.mailboxes.security}`,
      `Expires: ${await expires()}`,
      `Policy: ${project.url}/terms`,
      "Preferred-Languages: en, ar",
      `Canonical: ${project.url}/.well-known/security.txt`,
      "",
    ].join("\n"),
    { headers: { "content-type": "text/plain; charset=utf-8" } }
  );
