import QRCode from "react-qr-code";
import { cn } from "../../lib/utils";
import { BrandLogo } from "../brand-logo";
import { Guilloche, seedFromText } from "./guilloche";

interface Signer {
  /** The signer's name on the platform; empty until they sign. */
  readonly name: string;
  /** Their seat: "Editor-in-Chief", "Qalam lead", "President". */
  readonly role: string;
}

export interface CertificateProps {
  /** What it is for (the Prize's citation, or finishing Qalam). */
  readonly body: string;
  readonly className?: string;
  /** "Given on April 27, 2028" / «مُنحت في 27 نيسان 2028». */
  readonly dated: string;
  /** "This certifies that" / «تشهد الجمعية بأن». */
  readonly lead: string;
  /**
   * The one language of this certificate, the one its recipient chose; the
   * Arabic one is mirrored and carries the Arabic lockup.
   */
  readonly locale: "en" | "ar";
  /** The motto, at the foot. */
  readonly motto: string;
  /** The recipient's full name (a Qalam student's appears only here). */
  readonly name: string;
  /** A line in place of the date when the certificate was revoked. */
  readonly notice?: string;
  /** The foot: the rosette from the serial, the codes and the QR. */
  readonly seal: {
    /** The kind's code: "SAL-EDT · Qalam". */
    readonly code: string;
    readonly qrLabel: string;
    readonly serial: string | null;
    /** auibsal.org/verify/<code>, once issued. */
    readonly verifyUrl: string | null;
  };
  /** Who signs, in order: two each. */
  readonly signers: readonly [Signer, Signer];
  /** "AUIB Society of Arts and Letters", under the lockup. */
  readonly society: string;
  /** "Certificate of completion, Qalam" or "The Mutanabbi Prize". */
  readonly title: string;
}

/**
 * The certificate (SAL-MED-02; decided Nov 7): one component for the two
 * the Society gives, finishing Qalam and the Mutanabbi Prize (each
 * category). A4 landscape: the lockup, the title in Light, "This certifies
 * that", the name over a hairline, what it is for, the date it was given,
 * the two signers, the motto, and at the foot a rosette drawn from the
 * serial (its check page draws the same one), the serial and address, and
 * a QR to auibsal.org/verify/<code>. "Download PDF" is the browser's own
 * print-to-PDF, so Arabic is shaped correctly. A certificate is paper:
 * always the light ground.
 */
export const Certificate = ({
  body,
  className,
  dated,
  lead,
  locale,
  motto,
  name,
  notice,
  seal,
  signers,
  society,
  title,
}: CertificateProps) => (
  <article
    className={cn(
      "grid aspect-[297/210] w-full content-between gap-6 border-2 border-line bg-surface p-10 text-center text-text print:rounded-none print:border-0",
      className
    )}
    data-theme="light"
    dir={locale === "ar" ? "rtl" : "ltr"}
    lang={locale}
  >
    <header className="grid justify-items-center gap-2">
      <BrandLogo ground="light" height={56} locale={locale} />
      <p className="type-label tracking-widest">{society}</p>
    </header>

    <div className="grid justify-items-center gap-4">
      <h1 className="font-light text-4xl text-text">{title}</h1>
      <p className="type-body">{lead}</p>
      <p className="border-line border-b px-8 pb-1 font-light text-3xl">
        {name}
      </p>
      <p className="type-body max-w-2xl text-lg">{body}</p>
      <p className={notice ? "font-medium text-text" : "type-caption"}>
        {notice ?? dated}
      </p>
    </div>

    <footer className="grid gap-6">
      <p className="type-caption">{motto}</p>
      <div className="grid grid-cols-2 items-end gap-6 text-sm">
        {signers.map((signer) => (
          <div
            className="grid gap-1 border-line border-t pt-2"
            key={signer.role}
          >
            <span className="font-medium">{signer.name}</span>
            <span className="type-caption">{signer.role}</span>
          </div>
        ))}
      </div>
      <div className="flex items-end justify-between gap-6">
        {seal.serial ? (
          <Guilloche
            className="size-20 shrink-0"
            number={seedFromText(seal.serial)}
            stroke="stroke-text"
          />
        ) : (
          <span />
        )}
        <p className="type-caption self-center" dir="ltr">
          {[seal.serial, seal.code, seal.verifyUrl].filter(Boolean).join(" · ")}
        </p>
        {seal.verifyUrl ? (
          <QRCode
            aria-label={seal.qrLabel}
            className="size-20 shrink-0"
            size={80}
            value={seal.verifyUrl}
          />
        ) : (
          <span />
        )}
      </div>
    </footer>
  </article>
);
