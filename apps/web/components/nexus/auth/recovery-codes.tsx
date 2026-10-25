"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { formatNumber } from "@repo/internationalization/format";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { callApi } from "@/lib/nexus/api";
import { DiwanSection } from "../page";
import { useTwoStep } from "./two-step";

/** When to ask for a new set before the last one runs out. */
const FEW_LEFT = 3;

/**
 * Recovery codes, for those whose role needs two-step sign-in: shown on the
 * Diwan's overview until a set is saved, and again when few are left. The
 * new codes are shown once, here, and never stored in the clear.
 */
export const RecoveryCodes = () => {
  const t = useTranslations("nexus.recoveryCodes");
  const locale = useLocale();
  const { supabase, user } = useAuth();
  const twoStep = useTwoStep();
  const [codes, setCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const needs = Boolean(twoStep.data?.needs && twoStep.data.done);

  const left = useQuery({
    enabled: needs && Boolean(user),
    queryFn: async () => {
      const { count, error } = await supabase
        .schema("access")
        .from("recovery_codes")
        .select("id", { count: "exact", head: true })
        .is("used_at", null);
      if (error) {
        throw error;
      }
      return count ?? 0;
    },
    queryKey: ["recovery-codes", user?.id ?? ""],
  });

  const make = useMutation({
    mutationFn: () =>
      callApi<{ codes: string[] }>(supabase, "/two-step/recovery-codes", {}),
    onSuccess: (data) => {
      setCopied(false);
      setCodes(data.codes);
    },
  });

  if (codes) {
    const copy = async () => {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
    };
    return (
      <DiwanSection
        description={t("saveBody")}
        id="recovery-codes"
        title={t("saveTitle")}
      >
        <ol
          className="grid max-w-md grid-cols-2 gap-x-6 gap-y-2 font-mono text-lg tracking-wider"
          dir="ltr"
        >
          {codes.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-4">
          <Button onClick={copy} type="button" variant="outline">
            {copied ? t("copied") : t("copy")}
          </Button>
          <Button
            onClick={() => {
              setCodes(null);
              left.refetch();
            }}
            type="button"
          >
            {t("saved")}
          </Button>
        </div>
      </DiwanSection>
    );
  }

  if (!needs || left.data === undefined || left.data > FEW_LEFT) {
    return null;
  }

  return (
    <DiwanSection
      description={
        left.data === 0
          ? t("noneBody")
          : t("fewBody", { count: formatNumber(left.data, locale) })
      }
      id="recovery-codes"
      title={left.data === 0 ? t("noneTitle") : t("fewTitle")}
    >
      <div className="grid gap-2">
        <Button
          className="justify-self-start"
          disabled={make.isPending}
          onClick={() => make.mutate()}
          type="button"
        >
          {left.data === 0 ? t("make") : t("remake")}
        </Button>
        {make.isError ? (
          <p className="type-body" role="alert">
            {t("failed")}
          </p>
        ) : null}
      </div>
    </DiwanSection>
  );
};
