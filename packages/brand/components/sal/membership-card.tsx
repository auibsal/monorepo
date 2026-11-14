"use client";

import QRCode from "react-qr-code";
import { cn } from "../../lib/utils";
import { BrandLogo } from "../brand-logo";
import { Guilloche } from "./guilloche";

/** The card number as printed: five digits (No. 00042). */
export const cardNumber = (value: number) => String(value).padStart(5, "0");

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="grid content-start gap-1">
    <dt className="type-label text-text-secondary">{label}</dt>
    <dd className="text-text font-medium tabular-nums">{value}</dd>
  </div>
);

export interface MembershipCardProps {
  /** The class, already in words: Member, Associate Member, Honorary Member. */
  readonly classLabel?: string;
  readonly className?: string;
  readonly labels: {
    /** "Class". */
    readonly class: string;
    /** "No." */
    readonly number: string;
    /** What the QR opens, for screen readers. */
    readonly qr: string;
  };
  readonly locale: "en" | "ar";
  /** The member's name in the card's language. */
  readonly name: string;
  /** The number from the one series; printed with five digits. */
  readonly number: number;
  /**
   * The role held now, in the card's language, on the line under the name
   * ("Editor-in-Chief", "Event Lead, Writing workshop"); none without one.
   */
  readonly office?: string | null;
  /**
   * The live QR: its link (null while the first code is made) and the share
   * of its 30 seconds still to run, 0 to 1. Without `left` the code shows
   * no countdown (the design system's still pictures).
   */
  readonly qr: { readonly left?: number; readonly value: string | null };
  /** "Since 2026", already formatted. */
  readonly since?: string;
  /** "Membership card". */
  readonly title: string;
}

/**
 * The membership card (SAL-MED-02; decisions §6, §11: "membership card",
 * never "ID card"): paper, the lockup, the name, the current role on the
 * line under it while it is held, the number and the class (or Guest), a
 * rosette drawn from the number, the year since and the live QR, which
 * links to auibsal.org/verify/member/<code>?t=<digits> and changes every 30
 * seconds. One design, on screens only (there is no printed card): the
 * account and Google Wallet (the same fields) show this one. The card is an object, like a
 * certificate: it keeps the light theme, and it holds still (no tilt, sheen
 * or turning pattern; the live QR is what shows the card is current).
 */
export const MembershipCard = ({
  classLabel,
  className,
  labels,
  locale,
  name,
  number,
  office,
  qr,
  since,
  title,
}: MembershipCardProps) => (
  <div
    className={cn(
      "border-line bg-surface-reading text-text relative grid max-w-3xl gap-8 overflow-hidden border p-6 sm:grid-cols-[1fr_auto] sm:p-8 print:break-inside-avoid",
      className
    )}
    data-theme="light"
    lang={locale}
  >
    <div className="pointer-events-none absolute start-1/4 top-1/2 size-[26rem] -translate-x-1/2 -translate-y-1/2 rtl:translate-x-1/2">
      <Guilloche className="size-full opacity-40" number={number} />
    </div>
    <div className="relative grid content-between gap-8">
      <div className="flex items-start justify-between gap-4">
        <BrandLogo ground="light" height={44} locale={locale} />
        <p className="type-label text-text-secondary pt-1 text-end">{title}</p>
      </div>
      <div className="grid gap-2">
        <p className="type-display text-balance" dir="auto">
          {name}
        </p>
        {office ? (
          <p className="type-heading text-text-secondary" dir="auto">
            {office}
          </p>
        ) : null}
      </div>
      <dl className="border-line grid grid-cols-2 gap-x-8 gap-y-4 border-t pt-4 sm:grid-cols-4">
        <Field label={labels.number} value={cardNumber(number)} />
        {classLabel ? <Field label={labels.class} value={classLabel} /> : null}
      </dl>
    </div>
    <figure className="sm:border-line relative grid content-start justify-items-center gap-2 sm:border-s sm:ps-8">
      <div className="bg-surface grid w-40 gap-2 p-3">
        {qr.value ? (
          <QRCode
            aria-label={labels.qr}
            className="h-auto w-full"
            size={148}
            value={qr.value}
          />
        ) : (
          <span className="block aspect-square w-full" />
        )}
        {/* Time left on this code: a hairline that empties. */}
        {qr.left === undefined ? null : (
          <span aria-hidden="true" className="bg-line h-px w-full">
            <span
              className="bg-text block h-px transition-[width] duration-1000 ease-linear"
              style={{ width: `${qr.left * 100}%` }}
            />
          </span>
        )}
      </div>
      {since ? (
        <figcaption className="type-label text-text-secondary text-center">
          {since}
        </figcaption>
      ) : null}
    </figure>
    {/* The one accent on the card: a crimson rule along its foot. */}
    <span
      aria-hidden="true"
      className="bg-accent absolute inset-x-0 bottom-0 h-1.5"
    />
  </div>
);
