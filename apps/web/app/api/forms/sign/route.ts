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

const KIND_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;

const body = z.object({
  anonymous: z.boolean().default(false),
  data: z.record(z.string().max(64), z.unknown()),
  esign_agreed: z.boolean().default(false),
  // The kind's name ("media-release"; decisions.md, Names, not numbers).
  form: z.string().regex(KIND_NAME),
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
  if (input.form === "parent-consent" && typeof data === "string") {
    await makeParent(data, input.signer_name).catch((cause: unknown) =>
      log.error(`Parent account not made: ${parseError(cause)}`)
    );
  }
  if (input.form === "qalam-parent-consent" && typeof data === "string") {
    await makeQalamAccounts(data, input.data, input.signer_name).catch(
      (cause: unknown) =>
        log.error(`Qalam's accounts not made: ${parseError(cause)}`)
    );
  }
  return json({ id: data });
};

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/u;

const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * The account at an address, or a new guest's account there, named by the
 * name given where it is made (decisions.md, Members: no name fields).
 */
const guestAccount = async (
  admin: Admin,
  email: string,
  metadata: Record<string, string>
) => {
  const found = await admin
    .schema("governance")
    .rpc("user_by_email", { email });
  if (found.data) {
    return { existing: true, id: found.data };
  }
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    // A guest's account: an address outside AUIB is allowed for it.
    user_metadata: { ...metadata, guest: true },
  });
  if (created.error) {
    throw created.error;
  }
  return { existing: false, id: created.data.user.id };
};

/**
 * Qalam's consent, signed by a parent through their own link (decisions.md,
 * Documents and forms: Qalam), makes the parent's guest account (by the
 * address the link went to) with the Parent role on their child, and the
 * student's guest account (by the address the parent gave) with the Qalam
 * student role. The parent is emailed how to sign in; the teacher already
 * has a copy of the consent. The site never writes to the student: contact
 * goes through the teacher. The consent stands even if this step fails.
 */
const makeQalamAccounts = async (
  submissionId: string,
  answers: Record<string, unknown>,
  signerName: string
) => {
  const admin = createAdminClient();
  const link = await admin
    .schema("governance")
    .rpc("consent_link", { submission_id: submissionId })
    .maybeSingle();
  const parentEmail = link.data?.sent_to ?? "";
  const email = text(answers.student_email, 320).toLowerCase();
  const first = text(answers.student_first_name, 80);
  const last = text(answers.student_last_name, 80);
  if (!(EMAIL.test(parentEmail) && EMAIL.test(email) && first && last)) {
    return;
  }
  const parent = await guestAccount(admin, parentEmail, {
    full_name_en: signerName.trim(),
  });
  const student = await guestAccount(admin, email, {
    first_name_en: first,
    last_name_en: last,
  });
  const enrolled = await admin.schema("programmes").rpc("qalam_enroll", {
    parent: parent.id,
    student: student.id,
    submission_id: submissionId,
  });
  if (enrolled.error) {
    throw enrolled.error;
  }
  await admin
    .schema("core")
    .from("outbox")
    .insert({
      kind: "membership.parent_account",
      payload: { existing: parent.existing, qalam: true, user_id: parent.id },
    });
};

/**
 * A parent's consent for a member under 18 makes the parent a guest account
 * with the "Parent" role on the child (decisions.md, Members: Parents),
 * found or created by the address the link was sent to; the parent is
 * emailed how to sign in. The consent stands even if this step fails.
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
  const parent = await guestAccount(admin, email, {
    full_name_en: signerName.trim(),
  });
  const made = await admin
    .schema("governance")
    .rpc("make_parent", { parent: parent.id, submission_id: submissionId });
  if (made.error) {
    throw made.error;
  }
  await admin
    .schema("core")
    .from("outbox")
    .insert({
      kind: "membership.parent_account",
      payload: { existing: parent.existing, user_id: parent.id },
    });
};
