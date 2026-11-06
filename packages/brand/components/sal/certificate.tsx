import type { ReactNode } from "react";
import QRCode from "react-qr-code";
import { cn } from "../../lib/utils";
import { BrandLogo } from "../brand-logo";

const SCHEME = /^https?:\/\//;

interface CertificateProps {
  /** One or two sentences under the name: what was done, and when. */
  readonly body: ReactNode;
  readonly className?: string;
  /** The verification code, printed at the foot ("Q28-4F7K-91"). */
  readonly code: string;
  /** The line above the name: "This is to record that". */
  readonly lead: string;
  readonly locale?: string;
  /** The QR's label for screen readers. */
  readonly qrLabel: string;
  /** The person, as the certificate names them. */
  readonly recipient: string;
  /** The rosette drawn from the serial (the app's Guilloche). */
  readonly rosette?: ReactNode;
  /** The signature lines, in order: the role under each line. */
  readonly signatures: readonly {
    readonly role: string;
    readonly name?: string;
  }[];
  /** "Qalam" or "The Mutanabbi Prize". */
  readonly title: string;
  /** The check page, `auibsal.org/verify/<code>`. */
  readonly verifyUrl: string;
}

/**
 * The certificate (SAL-MED-02; decided Nov 7): one component for the only
 * two the Society gives, finishing Qalam and the Mutanabbi Prize (each
 * category). A4 landscape, one hairline frame, the lockup, a Light title,
 * the name on a rule, the signature lines, and at the foot the
 * verification code with a QR to its check page. On screen it is the same
 * page; printed or saved as PDF from the browser, it fills the A4 sheet.
 */
export const Certificate = ({
  body,
  className,
  code,
  lead,
  locale = "en",
  qrLabel,
  recipient,
  rosette,
  signatures,
  title,
  verifyUrl,
}: CertificateProps) => (
  <article
    className={cn(
      "relative aspect-[297/210] w-full max-w-5xl bg-surface p-[4%] text-text print:aspect-auto print:h-[210mm] print:w-[297mm] print:max-w-none print:p-[11mm]",
      className
    )}
    data-theme="light"
  >
    <div className="grid h-full grid-rows-[auto_1fr_auto] border border-text p-[5%] text-center print:p-[14mm]">
      <div className="grid justify-items-center gap-space-4">
        <BrandLogo ground="light" height={56} locale={locale} />
        <h1 className="font-light text-[clamp(1.75rem,4vw,2.75rem)] leading-none tracking-[-0.02em]">
          {title}
        </h1>
      </div>
      <div className="grid content-center justify-items-center gap-space-3">
        <p className="font-light text-lg">{lead}</p>
        <p
          className="w-full max-w-xl border-text border-b pb-2 font-light text-[clamp(1.5rem,3.2vw,2.25rem)]"
          dir="auto"
        >
          {recipient}
        </p>
        <div className="max-w-2xl font-light text-lg leading-relaxed">
          {body}
        </div>
      </div>
      <div className="grid gap-space-4">
        <div className="flex flex-wrap justify-center gap-x-space-6 gap-y-space-3">
          {signatures.map((signature) => (
            <div
              className="grid w-40 gap-1 border-text border-t pt-2 text-sm"
              key={signature.role}
            >
              {signature.name ? <span>{signature.name}</span> : null}
              <span className="text-text-secondary">{signature.role}</span>
            </div>
          ))}
        </div>
        <div className="flex items-end justify-between gap-space-4">
          <div className="size-16">{rosette}</div>
          <p className="type-code self-center text-text-secondary" dir="ltr">
            {code} · {verifyUrl.replace(SCHEME, "")}
          </p>
          <QRCode
            aria-label={qrLabel}
            bgColor="#fff"
            className="size-16"
            fgColor="currentColor"
            size={64}
            value={verifyUrl}
          />
        </div>
      </div>
    </div>
  </article>
);
