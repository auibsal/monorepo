"use client";

import { Button } from "@repo/brand/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";
import { useEsign } from "@/lib/diwan/queries";
import { DiwanPage, DiwanSection } from "../page";

const useAnswer = () => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (agree: boolean) =>
      unwrap(await supabase.schema("core").rpc("answer_esign", { agree })),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["account", "esign"] }),
  });
};

/**
 * Asked once, at the first sign-in after the question was added
 * (decisions.md, Documents and forms: consent to sign electronically,
 * E-SIGN): "I agree" records it; "Not now" only that it was asked, and the
 * page where the person next signs asks again.
 */
export const EsignQuestion = () => {
  const t = useTranslations("diwan.esign");
  const answer = useAnswer();
  return (
    <DiwanPage lede={t("lede")} narrow title={t("title")}>
      <p className="type-body">{t("what")}</p>
      <div className="flex flex-wrap items-center gap-4">
        <Button disabled={answer.isPending} onClick={() => answer.mutate(true)}>
          {t("agree")}
        </Button>
        <button
          className="link"
          disabled={answer.isPending}
          onClick={() => answer.mutate(false)}
          type="button"
        >
          {t("notNow")}
        </button>
      </div>
    </DiwanPage>
  );
};

/** Settings: the consent, given or withdrawn (E-SIGN lets it be withdrawn). */
export const EsignSettings = () => {
  const t = useTranslations("diwan.esign");
  const locale = useLocale() as Locale;
  const esign = useEsign();
  const answer = useAnswer();
  const given = esign.data?.agreed_at;
  return (
    <DiwanSection id="esign" title={t("settingsTitle")}>
      <p className="type-body">
        {given
          ? t("given", { date: formatLongDate(given, locale, true) })
          : t("notGiven")}
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <button
          className="link"
          disabled={answer.isPending || esign.isPending}
          onClick={() => answer.mutate(!given)}
          type="button"
        >
          {given ? t("withdraw") : t("agree")}
        </button>
      </div>
    </DiwanSection>
  );
};
