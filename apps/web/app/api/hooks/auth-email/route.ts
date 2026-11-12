import { project } from "@repo/config";
import { sendEmail } from "@repo/email";
import { type AuthEmailKind, authEmail, type Lang } from "@repo/email/copy";
import { Notice, noticeText } from "@repo/email/templates/notice";
import { localizedPath } from "@repo/internationalization";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { problem } from "@/lib/api/problem";
import { verifyStandardWebhook } from "@/lib/api/svix";
import { origin } from "@/lib/api/urls";
import { parseError } from "@/lib/observability/error";
import { log } from "@/lib/observability/log";

const payload = z.object({
  email_data: z.object({
    email_action_type: z.string(),
    redirect_to: z.string().optional().default(""),
    token: z.string().optional().default(""),
    token_hash: z.string().optional().default(""),
    token_hash_new: z.string().optional().default(""),
    token_new: z.string().optional().default(""),
  }),
  user: z.object({
    email: z.string(),
    new_email: z.string().optional(),
    user_metadata: z.record(z.string(), z.unknown()).optional(),
  }),
});

/** Supabase's action types, as the Society names its emails. */
const KINDS: Record<string, AuthEmailKind> = {
  email_change: "email_change",
  email_changed_notification: "email_changed",
  mfa_factor_enrolled_notification: "mfa_added",
  mfa_factor_unenrolled_notification: "mfa_removed",
  password_changed_notification: "password_changed",
  reauthentication: "reauthentication",
  recovery: "recovery",
  signup: "signup",
};

/** The confirm page in the person's language; it signs in on its button. */
const confirmLink = (
  lang: Lang,
  tokenHash: string,
  type: string,
  next: string
) => {
  const url = new URL(`${origin()}${localizedPath(lang, "/auth/confirm")}`);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", type);
  if (next) {
    url.searchParams.set("next", next);
  }
  return url.toString();
};

const send = (to: string, built: ReturnType<typeof authEmail>) =>
  sendEmail({
    react: Notice({ blocks: built.blocks, footer: [], preview: built.preview }),
    replyTo: project.supportEmail,
    subject: built.subject,
    tags: [{ name: "kind", value: "auth" }],
    text: noticeText({ blocks: built.blocks, footer: [] }),
    to,
  }).then(() => undefined);

type Payload = z.infer<typeof payload>;

/**
 * A change of sign-in address: Supabase pairs the new address with
 * token_hash and the current one with token_hash_new when both are asked
 * to confirm.
 */
const sendEmailChange = async (
  lang: Lang,
  { email_data: data, user }: Payload
) => {
  const link = (hash: string) =>
    authEmail(lang, "email_change", {
      link: confirmLink(lang, hash, "email_change", data.redirect_to),
    });
  if (user.new_email && data.token_hash) {
    await send(user.new_email, link(data.token_hash));
  }
  if (data.token_hash_new) {
    await send(user.email, link(data.token_hash_new));
  }
};

/** Every other kind: a link (sign-up, a reset), a code, or a notice. */
const sendOne = async (
  lang: Lang,
  kind: AuthEmailKind,
  { email_data: data, user }: Payload
) => {
  const linked = kind === "signup" || kind === "recovery";
  const link =
    linked && data.token_hash
      ? confirmLink(lang, data.token_hash, kind, data.redirect_to)
      : undefined;
  const code =
    kind === "signup" || kind === "reauthentication" ? data.token : undefined;
  await send(user.email, authEmail(lang, kind, { code, link }));
};

/**
 * POST /api/hooks/auth-email: Supabase's Send Email hook (the third
 * prompt, §8). Sign-up confirmations, password resets, email changes, codes
 * and security notices go through Resend from hello@, in the Society's
 * template and the person's language (`user_metadata.locale`). Signed
 * with SEND_EMAIL_HOOK_SECRET (Standard Webhooks); anything else is
 * refused. Supabase treats any non-200 as a failed send.
 */
export const POST = async (request: Request) => {
  const secret = env.SEND_EMAIL_HOOK_SECRET;
  if (!secret) {
    return problem(503, "not_configured");
  }
  const body = await request.text();
  if (!verifyStandardWebhook(secret, request.headers, body)) {
    return problem(401, "unauthorized");
  }
  const parsed = payload.safeParse(JSON.parse(body));
  if (!parsed.success) {
    return problem(400, "invalid_request");
  }
  const kind = KINDS[parsed.data.email_data.email_action_type];
  if (!kind) {
    // Sign-in links by email are not offered (AGENTS.md, Auth).
    return NextResponse.json({});
  }
  const lang: Lang =
    parsed.data.user.user_metadata?.locale === "ar" ? "ar" : "en";
  try {
    await (kind === "email_change"
      ? sendEmailChange(lang, parsed.data)
      : sendOne(lang, kind, parsed.data));
  } catch (cause) {
    log.error(`Sign-in email not sent: ${parseError(cause)}`);
    return problem(500, "not_sent");
  }
  return NextResponse.json({});
};
