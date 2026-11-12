"use client";

import { localeDefinitions } from "@repo/internationalization/config";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { queryKeys, useProfile } from "@/lib/diwan/queries";
import { ErrorLine, Field, SelectInput } from "../admin/kit";

/**
 * The account's language (decisions.md, the fourth prompt, 7h): set from
 * the page the person signed up on, changed here. Emails, Hudhud's
 * messages and certificates follow it; the site follows its address.
 */
export const AccountLanguage = () => {
  const t = useTranslations("diwan.settings.language");
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const profile = useProfile();
  const save = useMutation({
    mutationFn: async (locale: "ar" | "en") => {
      const { error } = await supabase
        .schema("core")
        .from("profiles")
        .update({ locale })
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
  if (!profile.data) {
    return null;
  }
  const saved = profile.data.locale === "ar" ? "ar" : "en";
  const value = save.isPending ? (save.variables ?? saved) : saved;
  return (
    <div className="grid gap-2">
      <Field hint={t("hint")} label={t("label")}>
        {(id) => (
          <SelectInput
            className="w-56"
            disabled={save.isPending}
            id={id}
            onChange={(e) => save.mutate(e.target.value === "ar" ? "ar" : "en")}
            value={value}
          >
            <option lang="en" value="en">
              {localeDefinitions.en.label}
            </option>
            <option dir="rtl" lang="ar" value="ar">
              {localeDefinitions.ar.label}
            </option>
          </SelectInput>
        )}
      </Field>
      <ErrorLine error={save.error} />
    </div>
  );
};
