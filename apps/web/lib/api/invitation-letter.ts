import "server-only";

import { project } from "@repo/config";
import type { AdminClient } from "@repo/database/admin";
import type { InvitationSigner } from "@repo/email/copy";
import { presidentSigner } from "@/lib/api/signer";
import { api } from "@/lib/api/urls";

/**
 * The invitation is the President's letter (owner, Nov 7, 2026): it comes
 * from their address and closes with their signature on the platform. The
 * draft Broadcast and the test a sender mails themselves share these.
 */
export const invitationFrom = () =>
  `${project.name} <${project.presidentEmail}>`;

export const INVITATION_FOOTER =
  "You get this once, because you wrote at the Society’s typewriter or signed up at its table.";

/** The President's signature, dated the day of the letter (YYYY-MM-DD). */
export const invitationSigner = async (
  admin: AdminClient,
  day: string
): Promise<InvitationSigner | undefined> => {
  const president = await presidentSigner(admin);
  return president
    ? {
        image: `${api("/email/signature")}?seat=president&date=${day}`,
        name: president.name,
      }
    : undefined;
};
