"use client";

import { Button } from "@repo/brand/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";
import { useEsign } from "@/lib/diwan/queries";

const useAnswer = () => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (agree: boolean) =>
      unwrap(await supabase.schema("api").rpc("answer_esign", { agree })),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["account", "esign"] }),
  });
};

/**
 * Settings → Your data (decisions.md, Documents and forms: "Consent can be
 * withdrawn"): one line with the date it was given and "Withdraw consent",
 * which asks on the page before signing on the site stops. Never a switch.
 * Without consent, the line says each page you sign on asks you.
 */
export const EsignSettings = () => {
  const t = useTranslations("diwan.esign");
  const locale = useLocale() as Locale;
  const esign = useEsign();
  const answer = useAnswer();
  const [confirming, setConfirming] = useState(false);
  const given = esign.data?.agreed_at;
  if (!given) {
    return <p className="type-body">{t("notGiven")}</p>;
  }
  return (
    <div className="grid gap-3">
      <p className="type-body">
        {t("given", { date: formatLongDate(given, locale, true) })}{" "}
        {confirming ? null : (
          <button
            className="link"
            disabled={answer.isPending || esign.isPending}
            onClick={() => setConfirming(true)}
            type="button"
          >
            {t("withdraw")}
          </button>
        )}
      </p>
      {confirming ? (
        <div className="border-line grid gap-3 border-s ps-4">
          <p className="type-body max-w-[60ch]">{t("withdrawConfirm")}</p>
          <div className="flex flex-wrap items-center gap-4">
            <button
              className="link"
              onClick={() => setConfirming(false)}
              type="button"
            >
              {t("cancel")}
            </button>
            <Button
              disabled={answer.isPending}
              onClick={() =>
                answer.mutate(false, { onSuccess: () => setConfirming(false) })
              }
              size="sm"
              variant="outline"
            >
              {t("withdrawYes")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
