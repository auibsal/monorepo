import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { BrandLogo } from "../brand-logo";

interface LetterProps {
  /** The paragraphs of the letter. */
  readonly children: ReactNode;
  readonly className?: string;
  /** The form it comes from, "SAL-EXB-01 · F-05". */
  readonly code: string;
  /** The date, already formatted ("Saturday, November 7, 2026"). */
  readonly date: string;
  /** The line at the foot: hello@auibsal.org and auibsal.org. */
  readonly foot: string;
  /** The greeting, "Dear Lina,". */
  readonly greeting: string;
  readonly locale?: string;
  /** The recipient's name and address, one line each. */
  readonly recipient: readonly string[];
  /** Who signs: their name and seat. */
  readonly signer: { readonly name: string; readonly role: string };
  /** The closing, "Sincerely,". */
  readonly signOff: string;
  /** One line saying what the letter is ("Service letter"). */
  readonly subject: string;
}

/**
 * The letter (SAL-MED-02; decided Nov 7): one template for every letter
 * the Society sends (F-03, F-05, F-30, F-32, F-33, F-34, F-42). A4
 * portrait: the lockup at the top start, the date, the recipient, a
 * subject line, the body, the closing and the signer, and the code and
 * the Society's addresses at the foot. On screen it is the same page;
 * printed or saved as PDF from the browser, it fills the sheet.
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
  signOff,
  signer,
  subject,
}: LetterProps) => (
  <article
    className={cn(
      "grid min-h-[60rem] w-full max-w-3xl grid-rows-[auto_1fr_auto] gap-space-6 bg-surface p-[9%] text-text print:min-h-[297mm] print:w-[210mm] print:max-w-none print:p-[21mm]",
      className
    )}
    data-theme="light"
  >
    <header className="flex items-start justify-between gap-space-4">
      <BrandLogo ground="light" height={52} locale={locale} />
      <p className="pt-2 text-sm text-text-secondary">{date}</p>
    </header>
    <div className="grid content-start gap-space-4 text-[0.9375rem] leading-relaxed">
      <address className="grid not-italic">
        {recipient.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </address>
      <p className="font-medium">{subject}</p>
      <p>{greeting}</p>
      <div className="grid gap-space-3">{children}</div>
      <div className="grid gap-1 pt-space-3">
        <p>{signOff}</p>
        <p className="pt-space-5">{signer.name}</p>
        <p className="text-text-secondary">{signer.role}</p>
      </div>
    </div>
    <footer className="flex flex-wrap items-baseline justify-between gap-space-4 border-line border-t pt-3 text-text-secondary text-xs">
      <span className="type-code">{code}</span>
      <span>{foot}</span>
    </footer>
  </article>
);
