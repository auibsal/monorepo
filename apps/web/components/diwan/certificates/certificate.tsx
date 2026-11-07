"use client";

import { useAuth } from "@repo/auth/provider";
import {
  type CertificateProps,
  Certificate as CertificateSheet,
} from "@repo/brand/components/sal/certificate";
import { Button } from "@repo/brand/components/ui/button";
import { project } from "@repo/config";
import { localizedPath } from "@repo/internationalization";
import { formatPlainDate } from "@repo/internationalization/format";
import { recognition, unwrap } from "@repo/sal-data";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useQueryParam } from "@/lib/diwan/use-query-param";
import { EmptyLine, ErrorState, SectionSpinner } from "../states";

/** Reads one certificate with its recipient's name and its signers'. */
const useCertificate = (id: string) => {
  const { supabase } = useAuth();
  return useQuery({
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
      // A Qalam student has no account: the full name comes from the
      // roster (staff only), the one place it appears.
      const [member, student, signers] = await Promise.all([
        row.user_id
          ? supabase
              .schema("core")
              .from("profiles")
              .select("full_name_en, full_name_ar")
              .eq("id", row.user_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        row.qalam_student_id
          ? supabase
              .schema("programmes")
              .from("qalam_students")
              .select("first_name, last_name")
              .eq("id", row.qalam_student_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        recognition.certificateSignerNames(supabase, row.id),
      ]);
      return { member: member.data, row, signers, student: student.data };
    },
    queryKey: ["certificate", id],
  });
};

type Loaded = NonNullable<ReturnType<typeof useCertificate>["data"]>;

/** The certificate's words and seal, in its own language. */
const sheetProps = (
  { member, row, signers, student }: Loaded,
  qrLabel: string
) => {
  const kind = row.kind as recognition.CertificateKind;
  const lang = row.lang === "ar" ? "ar" : "en";
  const ar = lang === "ar";
  const copy = recognition.certificateCopy[lang];
  const name = student
    ? `${student.first_name} ${student.last_name}`
    : ((ar ? member?.full_name_ar : null) ?? member?.full_name_en ?? "");
  const verifyUrl = recognition.verificationUrl(
    project.url,
    localizedPath(lang, "/verify"),
    row.verification_code
  );
  const issued = row.status !== "draft" && row.issued_at;
  const [firstRole, secondRole] = recognition.certificateSigners[kind];
  const signerName = (en?: string | null, arName?: string | null) =>
    (ar ? arName : null) ?? en ?? "";
  const category = row.prize_category as
    | (typeof recognition.prizeCategories)[number]
    | null;
  const sheet: CertificateProps = {
    body: copy.body({
      category: category ? copy.categories[category] : "",
      citation: (ar ? row.citation_ar : row.citation_en) ?? "",
      kind,
    }),
    dated: row.issued_at
      ? copy.given(formatPlainDate(row.issued_at, lang))
      : "",
    lead: copy.lead,
    locale: lang,
    motto: project.motto[lang],
    name,
    notice: row.status === "revoked" ? copy.revoked : undefined,
    seal: {
      code: copy.codes[kind],
      qrLabel,
      serial: row.serial,
      verifyUrl: issued ? verifyUrl : null,
    },
    signers: [
      {
        name: signerName(signers?.first_en, signers?.first_ar),
        role: copy.roles[firstRole],
      },
      {
        name: signerName(signers?.second_en, signers?.second_ar),
        role: copy.roles[secondRole],
      },
    ],
    society: copy.society,
    title: copy.titles[kind],
  };
  return { row, sheet, verifyUrl };
};

/**
 * A certificate's page: the one certificate component (`@repo/brand`), in
 * the certificate's own language, with Download (the browser's
 * print-to-PDF, A4 landscape, so Arabic is shaped correctly) and, once
 * issued, Add to LinkedIn.
 */
export const Certificate = () => {
  const t = useTranslations("diwan.certificate");
  const id = useQueryParam("id") ?? "";
  const certificate = useCertificate(id);

  if (!id) {
    return (
      <EmptyLine action={{ href: "/account/record", label: t("back") }}>
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
      <EmptyLine action={{ href: "/account/record", label: t("back") }}>
        {t("missing")}
      </EmptyLine>
    );
  }

  const { row, sheet, verifyUrl } = sheetProps(certificate.data, t("qr"));
  const kind = row.kind as recognition.CertificateKind;
  const issued = row.status !== "draft" && row.issued_at;

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="type-body">
          {row.status === "draft" ? t(`draftNote.${kind}`) : t("printNote")}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => window.print()}>{t("download")}</Button>
          {issued && row.serial ? (
            <Button asChild variant="outline">
              <a
                href={recognition.linkedInUrl({
                  issuedAt: row.issued_at ?? "",
                  name: sheet.title,
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
      <CertificateSheet {...sheet} />
    </div>
  );
};
