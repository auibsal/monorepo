import { project } from "@repo/config";
import type { ReactElement } from "react";
import { Resend } from "resend";
import { EmailConfigError, sendError } from "./errors";
import { keys } from "./keys";

export { EmailConfigError, EmailQuotaError, sendError } from "./errors";

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
