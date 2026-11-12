import { createAdminClient } from "@repo/database/admin";
import { z } from "zod";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { respond } from "@/lib/api/problem";
import { visitorOf, withinRateLimit } from "@/lib/api/rate-limit";
import { isHuman } from "@/lib/api/turnstile";
import { forms } from "@/lib/data";
import { parseError } from "@/lib/observability/error";
import { log } from "@/lib/observability/log";

export const OPTIONS = preflight;

const body = z.object({
  anonymous: z.boolean().default(false),
  data: z.record(z.string().max(64), z.unknown()),
  esign_agreed: z.boolean().default(false),
  form: z.string().regex(/^f\d{2}$/u),
  link: z.string().max(100).nullish(),
  routing: z.enum(forms.routings).default("none"),
  signer_contact: z.string().max(200).nullish(),
  signer_name: z.string().max(200).default(""),
  subject_id: z.uuid().nullish(),
  token: z.string().max(4096).nullish(),
});

/** Database refusals the form page explains. */
const KNOWN = new Set([
  "anonymous_not_allowed",
  "esign_agreement_required",
  "link_not_valid",
  "rate_limited",
  "sign_in_required",
  "signature_required",
]);

/**
 * POST /api/forms/sign: a form signed without an account (a visitor's
 * pitch, a parent's consent by link) or an anonymous concern (audit C11).
 * Turnstile and a limit per address first; then governance.sign_form,
 * which keeps the signed copy (with the IP) and emails the signer theirs.
 * Signed-in members signing in their name call sign_form directly.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = respond(headers);

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: "invalid_request" }, 400);
  }
  const input = parsed.data;
  if (!(await withinRateLimit(request, "forms-sign", { max: 10 }))) {
    return json({ error: "rate_limited" }, 429);
  }
  if (!(await isHuman(request, input.token))) {
    return json({ error: "human_check_failed" }, 403);
  }

  const { data, error } = await createAdminClient()
    .schema("governance")
    .rpc("sign_form", {
      anonymous: input.anonymous,
      data: input.data as never,
      esign_agreed: input.esign_agreed,
      form_key: input.form,
      link_token: input.link ?? undefined,
      routing: input.routing,
      signer_contact: input.signer_contact ?? undefined,
      signer_ip: input.anonymous ? undefined : visitorOf(request),
      signer_name: input.signer_name,
      subject_id: input.subject_id ?? undefined,
    });
  if (error) {
    const code = [...KNOWN].find((k) => error.message.includes(k));
    if (code) {
      return json({ error: code }, 422);
    }
    log.error(`Form not signed: ${parseError(error)}`);
    return json({ error: "failed" }, 500);
  }
  if (input.form === "f46" && typeof data === "string") {
    await makeParent(data, input.signer_name).catch((cause: unknown) =>
      log.error(`Parent account not made: ${parseError(cause)}`)
    );
  }
  return json({ id: data });
};

/**
 * A parent's consent (F-46) makes the parent a guest account with the
 * "Parent" role on the child (decisions.md, Members: Parents), found or
 * created by the address the link was sent to; the parent is emailed how
 * to sign in. The consent stands even if this step fails.
 */
const makeParent = async (submissionId: string, signerName: string) => {
  const admin = createAdminClient();
  const link = await admin
    .schema("governance")
    .rpc("parent_link", { submission_id: submissionId })
    .maybeSingle();
  const email = link.data?.sent_to;
  if (!email) {
    return;
  }
  const found = await admin
    .schema("governance")
    .rpc("user_by_email", { email });
  let parent = found.data ?? null;
  const existing = Boolean(parent);
  if (!parent) {
    const created = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name_en: signerName.trim() },
    });
    if (created.error) {
      throw created.error;
    }
    parent = created.data.user.id;
  }
  const made = await admin
    .schema("governance")
    .rpc("make_parent", { parent, submission_id: submissionId });
  if (made.error) {
    throw made.error;
  }
  await admin
    .schema("core")
    .from("outbox")
    .insert({
      kind: "membership.parent_account",
      payload: { existing, user_id: parent },
    });
};
