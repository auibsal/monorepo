import { project } from "@repo/config";
import { createAdminClient } from "@repo/database/admin";
import { sendEmail } from "@repo/email";
import { announcement } from "@repo/email/copy";
import { Notice, noticeText } from "@repo/email/templates/notice";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { hasPermission } from "@/lib/api/permissions";
import { respond } from "@/lib/api/problem";
import { origin } from "@/lib/api/urls";
import { authenticateRequest } from "@/lib/auth/verify";
import { parseError } from "@/lib/observability/error";
import { log } from "@/lib/observability/log";

export const OPTIONS = preflight;

/** Where the readers' stop link will be. */
const TEST_LINE = {
  ar: "هذه تجربة، ولا تصل إلا إليك. سيحمل البريد المرسَل رابط الإيقاف.",
  en: "A test, sent only to you. The email that goes out carries a stop link.",
} as const;

/**
 * An announcement's test (decisions §18): the notice in English and in
 * Arabic, as its readers will get them, mailed to the President before
 * they say go. Recorded on the notice (`tested_at`); any later change
 * clears it, so it can't be sent before the President reads it again.
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
  if (!president) {
    return json({ error: "forbidden" }, 403);
  }
  const body = (await request.json().catch(() => ({}))) as { id?: unknown };
  const id = typeof body.id === "string" ? body.id : "";

  try {
    const admin = createAdminClient();
    const { data: notice } = await admin
      .schema("core")
      .from("announcements")
      .select("id, title_en, title_ar, body_en, body_ar, link_path, sent_at")
      .eq("id", id)
      .maybeSingle();
    if (!notice) {
      return json({ error: "not_found" }, 404);
    }
    if (notice.sent_at) {
      return json({ error: "announcement_closed" }, 409);
    }
    const { data: user } = await admin.auth.admin.getUserById(session.userId);
    const email = user?.user?.email ?? "";
    if (!email) {
      return json({ error: "no_president" }, 409);
    }
    for (const lang of ["en", "ar"] as const) {
      const built = announcement(lang, notice, origin());
      const footer = [{ text: TEST_LINE[lang] }];
      // biome-ignore lint/performance/noAwaitInLoops: two emails, in order
      await sendEmail({
        react: Notice({ blocks: built.blocks, footer, preview: built.preview }),
        replyTo: project.supportEmail,
        subject: `${lang === "ar" ? "تجربة" : "Test"}: ${built.subject}`,
        tags: [{ name: "kind", value: "announcement_test" }],
        text: noticeText({ blocks: built.blocks, footer }),
        to: email,
      });
    }
    await admin
      .schema("core")
      .from("announcements")
      .update({ tested_at: new Date().toISOString() })
      .eq("id", id);
    return json({ sent: email });
  } catch (error) {
    log.error("Announcement test failed", { error: parseError(error) });
    return json({ error: "send_failed" }, 500);
  }
};
