"use client";

import { useTranslations } from "next-intl";
import { Field, SelectInput } from "./kit";

export type InviteeLanguage = "en" | "ar";

/**
 * The language an invitation is written in: the invitee's, chosen by
 * whoever invites (audit D2; one language per email).
 */
export const InviteeLanguageField = ({
  onChange,
  value,
}: {
  readonly onChange: (value: InviteeLanguage) => void;
  readonly value: InviteeLanguage;
}) => {
  const t = useTranslations("diwan.admin.kit.inviteeLanguage");
  return (
    <Field hint={t("hint")} label={t("label")}>
      {(id) => (
        <SelectInput
          id={id}
          onChange={(e) => onChange(e.target.value as InviteeLanguage)}
          value={value}
        >
          <option value="en">{t("en")}</option>
          <option value="ar">{t("ar")}</option>
        </SelectInput>
      )}
    </Field>
  );
};
