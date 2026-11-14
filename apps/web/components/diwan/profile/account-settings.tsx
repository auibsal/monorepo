"use client";

import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Label } from "@repo/brand/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { names } from "@/lib/data";
import { queryKeys, useProfile } from "@/lib/diwan/queries";
import { ChoiceInput } from "../admin/choice-input";
import { ErrorLine, Field } from "../admin/kit";

interface ProfileChange {
  email_daily_updates?: boolean;
  email_receipts?: boolean;
  email_signed_copy?: boolean;
  short_name?: "father" | "fourth";
  title_form?: "masculine" | "feminine" | null;
}

/** Saves one of the person's own choices (RLS and column grants decide). */
const useSaveProfile = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (change: ProfileChange) => {
      const { error } = await supabase
        .schema("core")
        .from("profiles")
        .update(change)
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
};

/**
 * The official name, read-only (decisions.md, Members): given at sign-up
 * and locked; only Membership corrects it, with a second officer.
 */
export const OfficialName = () => {
  const t = useTranslations("diwan.settings.account");
  const profile = useProfile();
  if (!profile.data) {
    return null;
  }
  const full = (lang: "en" | "ar") =>
    names.nameParts
      .map((part) => names.partsFrom(profile.data, lang)[part].trim())
      .filter(Boolean)
      .join(" ");
  const complete = names.hasFourPartNames(profile.data);
  return (
    <div className="grid gap-2">
      <p className="type-label">{t("officialName")}</p>
      {(["en", "ar"] as const).map((lang) => (
        <p dir={lang === "ar" ? "rtl" : "ltr"} key={lang} lang={lang}>
          {full(lang) || "—"}
        </p>
      ))}
      <p className="type-caption max-w-[60ch]">
        {complete ? t("officialNameHint") : t("officialNameIncomplete")}
      </p>
    </div>
  );
};

/**
 * The short form of the name (decisions.md, Members): the given and
 * father's names by default, or the given and family names.
 */
export const ShortNameChoice = () => {
  const t = useTranslations("diwan.settings.account");
  const profile = useProfile();
  const save = useSaveProfile();
  if (!profile.data) {
    return null;
  }
  const value = save.isPending
    ? (save.variables?.short_name ?? profile.data.short_name)
    : profile.data.short_name;
  return (
    <div className="grid gap-2">
      <Field hint={t("shortNameHint")} label={t("shortName")}>
        {(id) => (
          <ChoiceInput
            disabled={save.isPending}
            id={id}
            onChange={(e) =>
              save.mutate({
                short_name: e.target.value === "fourth" ? "fourth" : "father",
              })
            }
            value={value}
          >
            <option value="father">{t("shortNames.father")}</option>
            <option value="fourth">{t("shortNames.fourth")}</option>
          </ChoiceInput>
        )}
      </Field>
      <ErrorLine error={save.error} />
    </div>
  );
};

/**
 * The Arabic form of a title that names the person (decisions.md,
 * Members): on the Council page, the masthead, the card and letters.
 */
export const ArabicFormChoice = () => {
  const t = useTranslations("diwan.settings.account");
  const profile = useProfile();
  const save = useSaveProfile();
  if (!profile.data) {
    return null;
  }
  const saved = profile.data.title_form ?? "";
  const value = save.isPending ? (save.variables?.title_form ?? "") : saved;
  return (
    <div className="grid gap-2">
      <Field hint={t("arabicFormHint")} label={t("arabicForm")}>
        {(id) => (
          <ChoiceInput
            disabled={save.isPending}
            id={id}
            onChange={(e) =>
              save.mutate({
                title_form:
                  e.target.value === "masculine" ||
                  e.target.value === "feminine"
                    ? e.target.value
                    : null,
              })
            }
            value={value}
          >
            <option value="">{t("arabicForms.unset")}</option>
            <option value="masculine">{t("arabicForms.masculine")}</option>
            <option value="feminine">{t("arabicForms.feminine")}</option>
          </ChoiceInput>
        )}
      </Field>
      <ErrorLine error={save.error} />
    </div>
  );
};

const EMAIL_CHOICES = [
  "email_signed_copy",
  "email_receipts",
  "email_daily_updates",
] as const;

/**
 * The emails about one's own records (decisions.md, Documents and forms):
 * the signed copy at once, a "received" email for an application or a
 * submission, and one daily update with later changes. All on by default;
 * each can be turned off, since everything stays in Your account.
 */
export const RecordEmails = () => {
  const t = useTranslations("diwan.settings.recordEmails");
  const profile = useProfile();
  const save = useSaveProfile();
  if (!profile.data) {
    return null;
  }
  return (
    <div className="grid gap-4">
      {EMAIL_CHOICES.map((key) => {
        const on = save.isPending
          ? (save.variables?.[key] ?? profile.data[key])
          : profile.data[key];
        return (
          <div className="flex items-start gap-3" key={key}>
            <Checkbox
              aria-describedby={`${key}-hint`}
              checked={on}
              disabled={save.isPending}
              id={key}
              onCheckedChange={(v) => save.mutate({ [key]: v === true })}
            />
            <div className="grid gap-1">
              <Label className="leading-normal" htmlFor={key}>
                {t(`${key}.label`)}
              </Label>
              <p className="type-caption" id={`${key}-hint`}>
                {t(`${key}.hint`)}
              </p>
            </div>
          </div>
        );
      })}
      <p className="type-caption max-w-[60ch]">{t("always")}</p>
      <ErrorLine error={save.error} />
    </div>
  );
};
