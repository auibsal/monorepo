import { project } from "@repo/config";

/**
 * Where a password manager sends someone to add or manage a passkey
 * (W3C's Passkey Endpoints, `/.well-known/passkey-endpoints`): the
 * account's Settings, at its passkeys section (decisions.md, Members: a
 * passkey as another way in).
 */
export const GET = () =>
  Response.json(
    {
      enroll: `${project.url}/account/settings#passkeys`,
      manage: `${project.url}/account/settings#passkeys`,
    },
    { headers: { "Cache-Control": "public, max-age=86400" } }
  );
