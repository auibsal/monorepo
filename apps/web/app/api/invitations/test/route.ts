import { project } from "@repo/config";
import { createAdminClient } from "@repo/database/admin";
import { sendEmail } from "@repo/email";
import { invitation } from "@repo/email/copy";
import { Notice, noticeText } from "@repo/email/templates/notice";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { inviteStopToken } from "@/lib/api/email-stop";
import {
  INVITATION_FOOTER,
  invitationSigner,
} from "@/lib/api/invitation-letter";
import { hasPermission } from "@/lib/api/permissions";
import { respond } from "@/lib/api/problem";
import { presidentId } from "@/lib/api/signer";
import { origin } from "@/lib/api/urls";
import { authenticateRequest } from "@/lib/auth/verify";
import { parseError } from "@/lib/observability/error";
import { log } from "@/lib/observability/log";

export const OPTIONS = preflight;

/** A page to quote when the sender typed none at the Tour. */
const SAMPLE = {
  station: "Food Court",
  words: "For sale: baby shoes, never worn.",
};

/**
 * A list's test (decisions §2): the invitation as one person on the list
 * would get it, mailed to the President before they say go (their letter,
 * signed and from their address; a Tour list quotes their own Tour page or
 * a sample). Recorded on the list (`tested_at`): the list can't be sent
 * before it. For the President, the Director of Membership (members.manage)
 * and whoever runs the Tour.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = respond(headers);

  const session = await authenticateRequest(request);
  if (!session) {
    return json({ error: "unauthorized" }, 401);
  }
  const president =
    (await hasPermission(session, "roles.assign")) &&
    (await hasPermission(session, "governance.manage"));
  if (
    !(
      president ||
      (await hasPermission(session, "members.manage")) ||
      (await hasPermission(session, "tour.run"))
    )
  ) {
    return json({ error: "forbidden" }, 403);
  }
  const body = (await request.json().catch(() => ({}))) as { list?: unknown };
  const list = typeof body.list === "string" ? body.list : "";

  try {
    const admin = createAdminClient();
    const { data: found } = await admin
      .schema("membership")
      .from("invitation_lists")
      .select("source, sent_at")
      .eq("source", list)
      .maybeSingle();
    if (!found) {
      return json({ error: "not_found" }, 404);
    }
    if (found.sent_at) {
      return json({ error: "invitation_list_closed" }, 409);
    }
    const presidentUser = await presidentId(admin);
    const { data: user } = presidentUser
      ? await admin.auth.admin.getUserById(presidentUser)
      : { data: null };
    const email = user?.user?.email ?? "";
    if (!(presidentUser && email)) {
      return json({ error: "no_president" }, 409);
    }
    const tour = list.startsWith("tour");
    const [{ data: profile }, { data: page }] = await Promise.all([
      admin
        .schema("core")
        .from("profiles")
        .select("first_name_en")
        .eq("id", presidentUser)
        .maybeSingle(),
      admin
        .schema("programmes")
        .from("six_words")
        .select("text, station")
        .eq("user_id", presidentUser)
        .limit(1)
        .maybeSingle(),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const built = invitation(
      "en",
      {
        first_name: profile?.first_name_en ?? null,
        kind: tour ? "tour" : "plain",
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
    await admin
      .schema("membership")
      .from("invitation_lists")
      .update({ tested_at: new Date().toISOString() })
      .eq("source", list);
    return json({ sent: email });
  } catch (error) {
    log.error("Invitation test failed", { error: parseError(error) });
    return json({ error: "send_failed" }, 500);
  }
};
