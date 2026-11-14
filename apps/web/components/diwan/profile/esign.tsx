"use client";

import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";
import { useEsign } from "@/lib/diwan/queries";
import { DiwanSection } from "../page";

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
