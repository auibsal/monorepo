import type { ReactElement } from "react";
import { Resend } from "resend";
import { keys } from "./keys";

const { RESEND_TOKEN } = keys();

/**
 * The one sender, in code (audit D1): every email and Broadcast comes from
 * the Society by its full name, at the address people reply to.
 */
export const SENDER = "AUIB Society of Arts and Letters <hello@auibsal.org>";

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
    throw new Error("Email is not configured: set RESEND_TOKEN.");
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
    throw QUOTA_ERRORS.has(error.name)
      ? new EmailQuotaError(error.message)
      : new Error(error.message);
  }

  return data;
};
