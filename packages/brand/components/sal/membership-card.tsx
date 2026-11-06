import type { ReactNode } from "react";
import QRCode from "react-qr-code";
import { cn } from "../../lib/utils";
import { BrandLogo } from "../brand-logo";

interface MembershipCardProps {
  readonly className?: string;
  /** The labels, in the page's language. */
  readonly labels: {
    readonly class: string;
    readonly number: string;
    readonly since: string;
    readonly title: string;
  };
  readonly locale?: string;
  /** Member, Associate Member or Honorary Member, already in the page's language. */
  readonly memberClass: string;
  /** "Member since", then the date or term, already formatted. */
  readonly memberSince: string;
  /** The member's name as it stands in the Register. */
  readonly name: string;
  /** The member number, as the card shows it ("SAL 000214"). */
  readonly number: string;
  /**
   * The live QR's address (`/verify/member/<code>?t=<digits>`), refreshed
   * by the page every 30 seconds; null while it loads.
   */
  readonly qr: string | null;
  /** The QR's label for screen readers. */
  readonly qrLabel: string;
  /** The rosette drawn from the card number (the app's Guilloche). */
  readonly rosette?: ReactNode;
}

/**
 * The membership card (SAL-MED-02; decided Nov 7: one component for the
 * account page, Google Wallet's fields and a printed card on request).
 * Never an "ID card": the AUIB ID is the university's. Name, member
 * number, class, member since and the live QR, on white, in the card's
 * 85.6 × 54 mm proportion. Printed, it is this same component at 100%.
 */
export const MembershipCard = ({
  className,
  labels,
  locale = "en",
  memberClass,
  memberSince,
  name,
  number,
  qr,
  qrLabel,
  rosette,
}: MembershipCardProps) => (
  <article
    aria-label={labels.title}
    className={cn(
      "relative grid aspect-[85.6/54] w-full max-w-xl grid-cols-[1fr_auto] gap-x-space-4 overflow-hidden border border-line bg-surface p-[6%] text-text print:w-[85.6mm] print:max-w-none print:p-[4mm]",
      className
    )}
    data-theme="light"
  >
    {rosette ? (
      <div className="pointer-events-none absolute -end-[12%] -top-[20%] size-[70%] opacity-30">
        {rosette}
      </div>
    ) : null}
    <div className="relative grid content-between gap-space-2">
      <BrandLogo ground="light" height={36} locale={locale} />
      <p
        className="font-light text-2xl leading-[1.05] tracking-[-0.02em] print:text-[11pt]"
        dir="auto"
      >
        {name}
      </p>
      <dl className="grid grid-cols-3 gap-x-space-3 border-line border-t pt-2 text-[0.8125rem] print:text-[6pt]">
        <div className="grid gap-0.5">
          <dt className="type-label text-text-secondary">{labels.number}</dt>
          <dd className="font-mono tabular-nums">{number}</dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="type-label text-text-secondary">{labels.class}</dt>
          <dd>{memberClass}</dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="type-label text-text-secondary">{labels.since}</dt>
          <dd>{memberSince}</dd>
        </div>
      </dl>
    </div>
    <div className="relative grid w-[min(28vw,7.5rem)] content-end print:w-[18mm]">
      {qr ? (
        <QRCode
          aria-label={qrLabel}
          bgColor="#fff"
          className="h-auto w-full"
          fgColor="currentColor"
          size={120}
          value={qr}
        />
      ) : (
        <span className="block aspect-square w-full bg-surface-reading" />
      )}
    </div>
  </article>
);
