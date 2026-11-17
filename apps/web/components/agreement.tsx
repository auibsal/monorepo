"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Label } from "@repo/brand/components/ui/label";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useId, useState } from "react";
import { MySignature } from "@/components/signature";
import { useAuth } from "@/lib/auth/provider";
import { useEsign } from "@/lib/diwan/queries";

/** The name the register holds: the one the database signs in. */
const useRegisterName = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      (await supabase.schema("api").rpc("my_register_name")).data ?? null,
    queryKey: ["forms", "me", user?.id],
  });
};

/**
 * One way to sign anything on the site (decisions.md, Documents and forms:
 * an agreement's summary): the three-line summary, "Read the full text"
 * opening in place, the signature block and one "Sign as …" button. Once
 * signed it leaves, and the confirmation with its record number stays.
 * Consent to sign electronically is asked once for the account (E-SIGN),
 * so only someone who hasn't given it sees the line.
 */
export const Agreement = ({
  full,
  onSigned,
  sign,
  summary,
  title,
}: {
  /** The full text, shown in place when asked for. */
  readonly full: ReactNode;
  readonly onSigned?: () => void;
  /** Signs; resolves to the record number, when the record has one. */
  readonly sign: (esignAgreed: boolean) => Promise<string | null | undefined>;
  /** Three lines on what the signer agrees to. */
  readonly summary: readonly string[];
  readonly title: string;
}) => {
  const t = useTranslations("common.agreement");
  const locale = useLocale() as Locale;
  const id = useId();
  const name = useRegisterName();
  const esign = useEsign();
  const consented = Boolean(esign.data?.agreed_at);
  const [checked, setChecked] = useState(false);
  const agreed = consented || checked;
  const mutation = useMutation({
    mutationFn: () => sign(agreed),
    onSuccess: () => onSigned?.(),
  });

  if (mutation.isSuccess) {
    return (
      <p className="type-body" role="status">
        {mutation.data
          ? t("signedRecord", {
              date: formatLongDate(new Date().toISOString(), locale),
              record: mutation.data,
            })
          : t("signed", {
              date: formatLongDate(new Date().toISOString(), locale),
            })}
      </p>
    );
  }

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="border-line grid max-w-2xl gap-3 border-t pt-4"
    >
      <h2 className="type-subheading" id={`${id}-title`}>
        {title}
      </h2>
      <ul className="grid gap-1">
        {summary.map((line) => (
          <li className="type-body" key={line}>
            {line}
          </li>
        ))}
      </ul>
      <details className="group">
        <summary className="link w-fit cursor-pointer">{t("readFull")}</summary>
        <div className="type-body border-line mt-3 grid gap-2 border-s ps-4">
          {full}
        </div>
      </details>
      <MySignature label={t("signatureLabel")} />
      {consented ? null : (
        <div className="flex items-start gap-2">
          <Checkbox
            checked={checked}
            id={`${id}-esign`}
            onCheckedChange={(value) => setChecked(value === true)}
          />
          <Label className="font-normal" htmlFor={`${id}-esign`}>
            {t("esign")}
          </Label>
        </div>
      )}
      <Button
        className="justify-self-start"
        disabled={!(agreed && name.data) || mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {t("signAs", { name: name.data ?? "" })}
      </Button>
      {mutation.error ? (
        <p className="type-caption text-accent" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </section>
  );
};
