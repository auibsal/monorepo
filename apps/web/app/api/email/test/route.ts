import { project } from "@repo/config";
import { createAdminClient } from "@repo/database/admin";
import { sendEmail } from "@repo/email";
import { type SampleName, samples } from "@repo/email/samples";
import { Notice, noticeText } from "@repo/email/templates/notice";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { respond } from "@/lib/api/problem";
import { withinRateLimit } from "@/lib/api/rate-limit";
import { authenticateRequest } from "@/lib/auth/verify";
import { parseError } from "@/lib/observability/error";
import { log } from "@/lib/observability/log";

export const OPTIONS = preflight;

const TEST_LINE = {
  ar: "هذه تجربة من صفحة التصميم، بمعطيات للعرض فقط، ولا تصل إلا إليك.",
  en: "A test from the design page, with sample data, sent only to you.",
} as const;

const isSample = (name: unknown): name is SampleName =>
  typeof name === "string" && Object.hasOwn(samples, name);

/**
 * "Send me a test" on the design page (decisions.md, Channels and email):
 * one email's sample, in English and in Arabic, mailed to the officer who
 * asks and to no one else. Staff only; ten tests in ten minutes.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = respond(headers);

  const session = await authenticateRequest(request);
  if (!session) {
    return json({ error: "unauthorized" }, 401);
  }
  const { data } = await session.supabase
    .schema("membership")
    .rpc("my_membership");
  const row = Array.isArray(data) ? data[0] : data;
  if (row?.staff !== true) {
    return json({ error: "forbidden" }, 403);
  }
  const body = (await request.json().catch(() => ({}))) as { name?: unknown };
  if (!isSample(body.name)) {
    return json({ error: "not_found" }, 404);
  }
  if (
    !(await withinRateLimit(request, "email-test", {
      key: session.userId,
      max: 10,
    }))
  ) {
    return json({ error: "rate_limited" }, 429);
  }

  try {
    const { data: user } = await createAdminClient().auth.admin.getUserById(
      session.userId
    );
    const to = user?.user?.email ?? "";
    if (!to) {
      return json({ error: "no_address" }, 409);
    }
    const make = samples[body.name];
    for (const lang of ["en", "ar"] as const) {
      const built = make(lang);
      const footer = [{ text: TEST_LINE[lang] }];
      // biome-ignore lint/performance/noAwaitInLoops: two emails, in order
      await sendEmail({
        react: Notice({ blocks: built.blocks, footer, preview: built.preview }),
        replyTo: project.supportEmail,
        subject: `${lang === "ar" ? "تجربة" : "Test"}: ${built.subject}`,
        tags: [{ name: "kind", value: "design_test" }],
        text: noticeText({ blocks: built.blocks, footer }),
        to,
      });
    }
    return json({ ok: true });
  } catch (error) {
    log.error("Design test email failed", { error: parseError(error) });
    return json({ error: "send_failed" }, 502);
  }
};
