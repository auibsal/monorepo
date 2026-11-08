import type { ReactNode } from "react";
import QRCode from "react-qr-code";
import { cn } from "../../lib/utils";
import { BrandLogo } from "../brand-logo";

const SCHEME = /^https?:\/\//u;

interface LetterProps {
  /** The paragraphs of the letter. */
  readonly children: ReactNode;
  readonly className?: string;
  /** The form it comes from, "SAL-EXB-01 · F-05". */
  readonly code: string;
  /**
   * The date, already formatted, with no weekday: "November 7, 2026",
   * «7 تشرين الثاني 2026».
   */
  readonly date: string;
  /** The line at the foot: hello@auibsal.org and auibsal.org. */
  readonly foot: string;
  /**
   * The greeting. A colon in business letters ("Dear Mr. Najm:"), a comma
   * only in personal letters to members ("Dear Lina,"). Arabic:
   * «السيد علي نجم المحترم،» or «عزيزتي لينا،».
   */
  readonly greeting: string;
  readonly locale?: string;
  /** The recipient's name and address, one line each. */
  readonly recipient: readonly string[];
  /** The letter's number, "LTR-2026-001" (decisions §6), under the date. */
  readonly reference?: string;
  /** Who signs: their name and seat. */
  readonly signer: { readonly name: string; readonly role: string };
  /** The closing: "Sincerely," / «مع خالص التحية،». */
  readonly signOff?: string;
  /** One line saying what the letter is ("Service letter"). */
  readonly subject: string;
  /**
   * The verification code and its check page (`auibsal.org/verify/<code>`),
   * printed at the foot beside the form code with a QR. Service letters
   * (F-05) carry one.
   */
  readonly verify?: {
    readonly code: string;
    readonly qrLabel: string;
    readonly url: string;
  };
}

const SIGN_OFF: Record<string, string> = {
  ar: "مع خالص التحية،",
  en: "Sincerely,",
};

/**
 * The letter (SAL-MED-02; decided Nov 7): one template for every letter
 * the Society sends (F-03, F-05, F-30, F-32, F-33, F-34, F-42). A4
 * portrait, in American business-letter form: the lockup at the top start,
 * the date (no weekday), the recipient, a subject line, the greeting (a
 * colon, or a comma in a personal letter to a member), the body, the
 * closing and the signer's name and seat; at the foot the form code, the
 * Society's addresses and, where the letter has one, its verification code
 * and QR. On screen it is the same page; printed or saved as PDF from the
 * browser, it fills the sheet.
 */
export const Letter = ({
  children,
  className,
  code,
  date,
  foot,
  greeting,
  locale = "en",
  recipient,
  reference,
  signOff,
  signer,
  subject,
  verify,
}: LetterProps) => (
  <article
    className={cn(
      "gap-space-6 bg-surface text-text grid min-h-[60rem] w-full max-w-3xl grid-rows-[auto_1fr_auto] p-[9%] print:min-h-[297mm] print:w-[210mm] print:max-w-none print:p-[21mm]",
      className
    )}
    data-theme="light"
  >
    <header className="gap-space-4 flex items-start justify-between">
      <BrandLogo ground="light" height={52} locale={locale} />
      <p className="text-text-secondary grid justify-items-end gap-1 pt-2 text-sm">
        <span>{date}</span>
        {reference ? (
          <span className="type-code" dir="ltr">
            {reference}
          </span>
        ) : null}
      </p>
    </header>
    <div className="gap-space-4 grid content-start text-[0.9375rem] leading-relaxed">
      <address className="grid not-italic">
        {recipient.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </address>
      <p className="font-medium">{subject}</p>
      <p>{greeting}</p>
      <div className="gap-space-3 grid">{children}</div>
      <div className="pt-space-3 grid gap-1">
        <p>{signOff ?? SIGN_OFF[locale] ?? SIGN_OFF.en}</p>
        <p className="pt-space-5">{signer.name}</p>
        <p className="text-text-secondary">{signer.role}</p>
      </div>
    </div>
    <footer className="gap-space-4 border-line text-text-secondary flex flex-wrap items-end justify-between border-t pt-3 text-xs">
      <div className="grid gap-1">
        <span className="type-code" dir="ltr">
          {code}
        </span>
        <span>{foot}</span>
      </div>
      {verify ? (
        <div className="gap-space-3 flex items-center">
          <span className="type-code" dir="ltr">
            {verify.code} · {verify.url.replace(SCHEME, "")}
          </span>
          <QRCode
            aria-label={verify.qrLabel}
            bgColor="#fff"
            className="size-12"
            fgColor="currentColor"
            size={48}
            value={verify.url}
          />
        </div>
      ) : null}
    </footer>
  </article>
);
