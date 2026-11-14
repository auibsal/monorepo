"use client";

import { Button } from "@repo/brand/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { names, unwrap } from "@/lib/data";
import { queryKeys, useEsign, useProfile } from "@/lib/diwan/queries";
import { ErrorLine } from "../admin/kit";
import { Section } from "./section";

/**
 * Consent to sign electronically, for an account made before the sign-up
 * line gave it (decisions.md, Documents and forms): a to-do on Today until
 * answered. "Not now" leaves it for the page where the person next signs.
 */
export const EsignToDo = () => {
  const t = useTranslations("diwan.esign");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const esign = useEsign();
  const answer = useMutation({
    mutationFn: async (agree: boolean) =>
      unwrap(await supabase.schema("core").rpc("answer_esign", { agree })),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["account", "esign"] }),
  });
  if (!esign.data || esign.data.asked_at || esign.data.agreed_at) {
    return null;
  }
  return (
    <Section description={t("lede")} id="esign" title={t("title")}>
      <p className="type-body max-w-[60ch]">{t("what")}</p>
      <div className="flex flex-wrap items-center gap-4">
        <Button
          disabled={answer.isPending}
          onClick={() => answer.mutate(true)}
          size="sm"
          variant="outline"
        >
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
      <ErrorLine error={answer.error} />
    </Section>
  );
};

/**
 * The Arabic form of a title that names the person (decisions.md,
 * Members), for an account made before sign-up asked it: one tap.
 */
export const ArabicFormToDo = () => {
  const t = useTranslations("diwan.home.toDos.arabicForm");
  const ts = useTranslations("diwan.settings.account.arabicForms");
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const profile = useProfile();
  const save = useMutation({
    mutationFn: async (form: "masculine" | "feminine") => {
      const { error } = await supabase
        .schema("core")
        .from("profiles")
        .update({ title_form: form })
        .eq("id", user?.id ?? "");
      if (error) {
        throw error;
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile(user?.id ?? ""),
      }),
  });
  if (!profile.data || profile.data.title_form) {
    return null;
  }
  return (
    <Section description={t("lede")} id="arabic-form" title={t("title")}>
      <div className="flex flex-wrap items-center gap-4">
        {(["masculine", "feminine"] as const).map((form) => (
          <Button
            disabled={save.isPending}
            key={form}
            onClick={() => save.mutate(form)}
            size="sm"
            variant="outline"
          >
            {ts(form)}
          </Button>
        ))}
      </div>
      <ErrorLine error={save.error} />
    </Section>
  );
};

/**
 * An official name with parts missing (an account from before the
 * four-part names): nothing to type here, since only Membership corrects
 * the name; the line says how.
 */
export const NameToDo = () => {
  const t = useTranslations("diwan.home.toDos.name");
  const profile = useProfile();
  if (!profile.data || names.hasFourPartNames(profile.data)) {
    return null;
  }
  return (
    <Section id="official-name" title={t("title")}>
      <p className="type-body max-w-[60ch]">{t("body")}</p>
    </Section>
  );
};
