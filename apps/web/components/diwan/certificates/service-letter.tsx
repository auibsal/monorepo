"use client";

import { Letter } from "@repo/brand/components/sal/letter";
import { Button } from "@repo/brand/components/ui/button";
import { project } from "@repo/config";
import { localizedPath } from "@repo/internationalization";
import { formatPlainDate } from "@repo/internationalization/format";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { recognition } from "@/lib/data";
import { useQueryParam } from "@/lib/diwan/use-query-param";
import { EmptyLine, ErrorState, SectionSpinner } from "../states";

/**
 * A service letter (SAL-EXB-01; decisions.md): the one letter
 * template (`Letter`, `@repo/brand`), in the letter's own language, with
 * its verification code and QR at the foot. Download is the browser's own
 * print-to-PDF. Its holder and the Director of Membership read it.
 */
export const ServiceLetter = () => {
  const t = useTranslations("diwan.serviceLetter");
  const { supabase } = useAuth();
  const id = useQueryParam("id") ?? "";
  const letter = useQuery({
    enabled: Boolean(id),
    queryFn: async () => {
      const row = await recognition.serviceLetter(supabase, id);
      if (!row) {
        return null;
      }
      const { data: holder } = await supabase
        .schema("core")
        .from("profiles")
        .select("full_name_en, full_name_ar")
        .eq("id", row.user_id)
        .maybeSingle();
      return { holder, row };
    },
    queryKey: ["service-letter", id],
  });

  if (letter.isPending && id) {
    return <SectionSpinner />;
  }
  if (letter.isError) {
    return <ErrorState />;
  }
  if (!letter.data) {
    return (
      <EmptyLine action={{ href: "/account/record", label: t("back") }}>
        {t("missing")}
      </EmptyLine>
    );
  }

  const { holder, row } = letter.data;
  const lang = row.lang === "ar" ? "ar" : "en";
  const ar = lang === "ar";
  const copy = recognition.serviceLetterCopy[lang];
  const name = (ar ? holder?.full_name_ar : null) ?? holder?.full_name_en ?? "";
  const url = recognition.verificationUrl(
    project.url,
    localizedPath(lang, "/verify"),
    row.verification_code
  );

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="type-body">
          {row.revoked_at ? t("revoked") : t("printNote")}
        </p>
        <Button onClick={() => window.print()}>{t("download")}</Button>
      </div>
      <div dir={ar ? "rtl" : "ltr"} lang={lang}>
        <Letter
          code={copy.code}
          date={formatPlainDate(row.issued_at, lang)}
          foot={copy.foot}
          greeting={copy.greeting}
          locale={lang}
          recipient={[]}
          reference={row.reference ?? undefined}
          signer={{
            name: (ar ? row.signer_ar : null) ?? row.signer_en ?? "",
            role: row.signer_feminine
              ? copy.signerRoleFeminine
              : copy.signerRole,
          }}
          subject={copy.subject}
          verify={{ code: row.verification_code, qrLabel: copy.qr, url }}
        >
          <p>
            {copy.body({
              from: formatPlainDate(row.period_from, lang),
              hours: row.hours ? String(Number(row.hours)) : null,
              name,
              role: (ar ? row.role_ar : null) ?? row.role_en,
              to: row.period_to ? formatPlainDate(row.period_to, lang) : null,
            })}
          </p>
          {row.body ? <p className="whitespace-pre-line">{row.body}</p> : null}
        </Letter>
      </div>
    </div>
  );
};
