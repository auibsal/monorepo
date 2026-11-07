import { authenticateRequest } from "@repo/auth/verify";
import { project } from "@repo/config";
import { createAdminClient } from "@repo/database/admin";
import { sendEmail } from "@repo/email";
import { invitation } from "@repo/email/copy";
import { Notice, noticeText } from "@repo/email/templates/notice";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { inviteStopToken } from "@/lib/api/email-stop";
import {
  INVITATION_FOOTER,
  invitationSigner,
} from "@/lib/api/invitation-letter";
import { hasPermission } from "@/lib/api/permissions";
import { origin } from "@/lib/api/urls";

export const OPTIONS = preflight;

/** A page to quote when the sender typed none at the Tour. */
const SAMPLE = {
  station: "Food Court",
  words: "For sale: baby shoes, never worn.",
};

/**
 * The invitation as one writer would get it, mailed to the person asking
 * (owner, Nov 7, 2026): the President's letter, signed and from their
 * address, greeting them by name and quoting their own Tour page (or a
 * sample). For whoever sends the invitations (roles.assign with
 * governance.manage) or runs the Tour.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = (data: object, status = 200) =>
    NextResponse.json(data, { headers, status });

  const session = await authenticateRequest(request);
  if (!session) {
    return json({ error: "unauthorized" }, 401);
  }
  const president =
    (await hasPermission(session, "roles.assign")) &&
    (await hasPermission(session, "governance.manage"));
  if (!(president || (await hasPermission(session, "tour.run")))) {
    return json({ error: "forbidden" }, 403);
  }
  const email =
    typeof session.claims.email === "string" ? session.claims.email : "";
  if (!email) {
    return json({ error: "no_email" }, 400);
  }

  try {
    const admin = createAdminClient();
    const [{ data: profile }, { data: page }] = await Promise.all([
      admin
        .schema("core")
        .from("profiles")
        .select("first_name_en")
        .eq("id", session.userId)
        .maybeSingle(),
      admin
        .schema("programmes")
        .from("six_words")
        .select("text, station")
        .or(`user_id.eq.${session.userId},email.eq.${email.toLowerCase()}`)
        .limit(1)
        .maybeSingle(),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const built = invitation(
      "en",
      {
        first_name: profile?.first_name_en ?? null,
        kind: "tour",
        pages: 1,
        station: page?.station ?? SAMPLE.station,
        words: page?.text ?? SAMPLE.words,
      },
      `${origin()}/join`,
      await invitationSigner(admin, today)
    );
    const footer = [
      {
        href: `${origin()}/emails/stop?invite=${inviteStopToken(email)}`,
        link: "Stop",
        text: INVITATION_FOOTER,
      },
    ];
    await sendEmail({
      react: Notice({ blocks: built.blocks, footer, preview: built.preview }),
      replyTo: project.supportEmail,
      subject: `Test: ${built.subject}`,
      tags: [{ name: "kind", value: "invitation_test" }],
      text: noticeText({ blocks: built.blocks, footer }),
      to: email,
    });
    return json({ sent: email });
  } catch (error) {
    log.error("Invitation test failed", { error: parseError(error) });
    return json({ error: "send_failed" }, 500);
  }
};
