"use client";

import { useAuth } from "@repo/auth/provider";
import { project } from "@repo/config";
import { BrandLogo } from "@repo/design-system/components/brand-logo";
import { Button } from "@repo/design-system/components/ui/button";
import { localizedPath } from "@repo/internationalization";
import {
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { localized, recognition, unwrap } from "@repo/sal-data";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import QRCode from "react-qr-code";
import { Guilloche, seedFromText } from "@/components/guilloche";
import { useQueryParam } from "@/lib/nexus/use-query-param";
import { EmptyLine, ErrorState, SectionSpinner } from "../states";

/**
 * A certificate, laid out for A4 landscape after Form F-28 (Printables).
 * "Download PDF" is the browser's own print-to-PDF, so Arabic is shaped
 * correctly. The verification code at the foot lets anyone check it.
 */
/**
 * The certificate's foot: its rosette (drawn from the serial, the same one
 * its check page shows), the serial and address, and a QR to its check.
 */
const CertificateSeal = ({
  code,
  qrLabel,
  serial,
  verifyUrl,
}: {
  code: string;
  qrLabel: string;
  serial: string | null;
  verifyUrl: string | null;
}) => (
  <div className="flex items-end justify-between gap-6">
    {serial ? (
      <Guilloche
        className="size-20 shrink-0"
        number={seedFromText(serial)}
        stroke="stroke-text"
      />
    ) : (
      <span />
    )}
    <p className="type-caption self-center" dir="ltr">
      {[serial, code, verifyUrl].filter(Boolean).join(" · ")}
    </p>
    {verifyUrl ? (
      <QRCode
        aria-label={qrLabel}
        className="size-20 shrink-0"
        size={80}
        value={verifyUrl}
      />
    ) : (
      <span />
    )}
  </div>
);

export const Certificate = () => {
  const t = useTranslations("nexus.certificate");
  const locale = useLocale();
  const { supabase } = useAuth();
  const id = useQueryParam("id") ?? "";

  const certificate = useQuery({
    enabled: Boolean(id),
    queryFn: async () => {
      const row = unwrap(
        await supabase
          .schema("membership")
          .from("certificates")
          .select("*")
          .eq("id", id)
          .maybeSingle()
      );
      if (!row) {
        return null;
      }
      const [holder, signers] = await Promise.all([
        supabase
          .schema("core")
          .from("profiles")
          .select("full_name_en, full_name_ar")
          .eq("id", row.user_id)
          .maybeSingle(),
        recognition.certificateSigners(supabase, row.id),
      ]);
      // The partner's name: from verification once issued, from the
      // register (when the reader may see it) while a draft.
      let partner: { name_ar: string | null; name_en: string | null } | null =
        null;
      if (row.partner_id && row.status !== "draft") {
        const verified = await recognition.verifyCertificate(
          supabase,
          row.verification_code
        );
        partner = verified
          ? { name_ar: verified.partner_ar, name_en: verified.partner_en }
          : null;
      } else if (row.partner_id) {
        const { data } = await supabase
          .schema("governance")
          .from("partners")
          .select("name_en, name_ar")
          .eq("id", row.partner_id)
          .maybeSingle();
        partner = data;
      }
      return { holder: holder.data, partner, row, signers };
    },
    queryKey: ["certificate", id],
  });

  if (!id) {
    return (
      <EmptyLine action={{ href: "/membership/record", label: t("back") }}>
        {t("missing")}
      </EmptyLine>
    );
  }
  if (certificate.isPending) {
    return <SectionSpinner />;
  }
  if (certificate.isError) {
    return <ErrorState />;
  }
  if (!certificate.data) {
    return (
      <EmptyLine action={{ href: "/membership/record", label: t("back") }}>
        {t("missing")}
      </EmptyLine>
    );
  }

  const { holder, row, signers } = certificate.data;
  const kind = row.kind as recognition.CertificateKind;
  const name = holder ? localized(holder, "full_name", locale) : "";
  const date = (value: string | null) =>
    value ? formatLongDate(value, locale, true) : "";
  const verifyUrl = recognition.verificationUrl(
    project.url,
    localizedPath(locale, "/verify"),
    row.verification_code
  );
  const values = {
    citation: localized(row, "citation", locale),
    from: date(row.period_from),
    hours: formatNumber(Number(row.hours ?? 0)),
    name,
    partner: certificate.data.partner
      ? localized(certificate.data.partner, "name", locale)
      : "",
    role: localized(row, "role", locale),
    to: date(row.period_to) || t("present"),
  };
  const issued = row.status !== "draft" && row.issued_at;

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="type-body">
          {row.status === "draft" ? t("draftNote") : t("printNote")}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => window.print()}>{t("download")}</Button>
          {issued && row.serial ? (
            <Button asChild variant="outline">
              <a
                href={recognition.linkedInUrl({
                  issuedAt: row.issued_at ?? "",
                  name: t(`titles.${kind}`),
                  serial: row.serial,
                  url: verifyUrl,
                })}
                rel="noopener"
                target="_blank"
              >
                {t("linkedIn")}
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <article
        className="grid aspect-[297/210] w-full content-between gap-6 border-2 border-line bg-surface p-10 text-center text-text print:rounded-none print:border-0"
        // A certificate is paper: always the light ground, also on the
        // Nexus's ink pages.
        data-theme="light"
        lang={locale}
      >
        <header className="grid justify-items-center gap-2">
          <BrandLogo height={56} locale={locale} />
          <p className="type-label tracking-widest">{t("society")}</p>
        </header>

        <div className="grid justify-items-center gap-4">
          <h1 className="font-light text-4xl text-text">
            {t(`titles.${kind}`)}
          </h1>
          <p className="type-body">{t("recordThat")}</p>
          <p className="border-line border-b px-8 pb-1 font-light text-3xl">
            {name}
          </p>
          <p className="type-body max-w-2xl text-lg">
            {t(`bodies.${kind}`, values)}
          </p>
          {row.status === "revoked" ? (
            <p className="font-bold text-text">{t("revoked")}</p>
          ) : null}
        </div>

        <footer className="grid gap-6">
          <p className="type-caption">
            {locale === "ar" ? project.motto.ar : project.motto.en}
          </p>
          <div className="grid grid-cols-3 items-end gap-6 text-sm">
            <div className="grid gap-1 border-line border-t pt-2">
              <span className="font-medium">
                {signers ? localized(signers, "president", locale) : ""}
              </span>
              <span className="type-caption">{t("president")}</span>
            </div>
            <div className="grid gap-1 border-line border-t pt-2">
              <span className="font-medium">
                {signers ? localized(signers, "advisor", locale) : ""}
              </span>
              <span className="type-caption">{t("advisor")}</span>
            </div>
            <div className="grid gap-1 border-line border-t pt-2">
              <span className="font-medium">{date(row.issued_at)}</span>
              <span className="type-caption">{t("date")}</span>
            </div>
          </div>
          <CertificateSeal
            code={t(`codes.${kind}`)}
            qrLabel={t("qr")}
            serial={row.serial}
            verifyUrl={issued ? verifyUrl : null}
          />
        </footer>
      </article>
    </div>
  );
};
