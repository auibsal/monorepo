import { project } from "@repo/config";
import type { ReactElement } from "react";
import { Resend } from "resend";
import { keys } from "./keys";

const { RESEND_BULK_DOMAIN, RESEND_TOKEN } = keys();

/**
 * The senders, in code (decisions.md, Channels and email): the site's own
 * emails come from "AUIB Society of Arts and Letters" at hello@; bulk mail
 * (announcements) from the same name and the Sunday Paper from "Qirtas",
 * both sent from news.auibsal.org once Resend has verified it, with
 * replies to hello@ and qirtas@.
 */
const SENDER = `${project.name} <${project.mailboxes.hello}>`;
export const BULK_SENDER = RESEND_BULK_DOMAIN
  ? `${project.name} <news@${RESEND_BULK_DOMAIN}>`
  : SENDER;
export const QIRTAS_SENDER = RESEND_BULK_DOMAIN
  ? `${project.journal.name_en} <qirtas@${RESEND_BULK_DOMAIN}>`
  : `${project.journal.name_en} <${project.mailboxes.qirtas}>`;

export const resend = RESEND_TOKEN ? new Resend(RESEND_TOKEN) : undefined;

type EmailContent =
  | { react: ReactElement; text?: string }
  | { react?: ReactElement; text: string };

type SendEmailOptions = EmailContent & {
  /** Extra headers, such as List-Unsubscribe on the newsletter. */
  headers?: Record<string, string>;
  /** Resend drops a repeat of the same key for 24 hours (safe retries). */
  idempotencyKey?: string;
  replyTo?: string;
  subject: string;
  /** Resend tags (letters, digits, "_" and "-"): which journey sent it. */
  tags?: { name: string; value: string }[];
  to: string | string[];
};

/**
 * The plan's daily or monthly sending limit is spent (the free plan allows
 * 100 a day). Nothing is wrong with the email; send it again after the
 * limit resets.
 */
export class EmailQuotaError extends Error {
  override name = "EmailQuotaError";
}

const QUOTA_ERRORS = new Set([
  "daily_quota_exceeded",
  "monthly_quota_exceeded",
]);

/**
 * The email key or its domain is wrong (a missing, invalid or restricted
 * key, an unverified domain). Nothing is wrong with the email; the outbox
 * keeps it and sends it once the configuration is fixed.
 */
export class EmailConfigError extends Error {
  override name = "EmailConfigError";
}

const CONFIG_ERRORS = new Set([
  "invalid_api_key",
  "invalid_from_address",
  "missing_api_key",
  "restricted_api_key",
]);
const CONFIG_MESSAGE = /api key|domain is not verified|not verified/iu;

/** Which error a failed send is: the plan's limit, the configuration, or the email. */
export const sendError = (error: { message: string; name: string }) => {
  if (QUOTA_ERRORS.has(error.name)) {
    return new EmailQuotaError(error.message);
  }
  if (CONFIG_ERRORS.has(error.name) || CONFIG_MESSAGE.test(error.message)) {
    return new EmailConfigError(error.message);
  }
  return new Error(error.message);
};

/** Sends a transactional email from `SENDER`. Throws on failure. */
export const sendEmail = async ({
  to,
  subject,
  replyTo,
  idempotencyKey,
  headers,
  tags,
  ...content
}: SendEmailOptions) => {
  if (!resend) {
    throw new EmailConfigError("Email is not configured: set RESEND_TOKEN.");
  }

  const { data, error } = await resend.emails.send(
    {
      from: SENDER,
      headers,
      replyTo,
      subject,
      tags,
      to,
      ...(content.react
        ? { react: content.react, text: content.text }
        : { text: content.text as string }),
    },
    idempotencyKey ? { idempotencyKey } : undefined
  );

  if (error) {
    throw sendError(error);
  }

  return data;
};
