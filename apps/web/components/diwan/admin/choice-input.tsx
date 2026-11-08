"use client";

import {
  ChoiceInput as BrandChoiceInput,
  type ChoiceInputProps as BrandProps,
} from "@repo/brand/components/sal/choice-input";
import { useTranslations } from "next-intl";

export type ChoiceInputProps = Omit<BrandProps, "labels">;

/** The design system's ChoiceInput, in the page's language. */
export const ChoiceInput = (props: ChoiceInputProps) => {
  const t = useTranslations("diwan.admin.kit.choices");
  return (
    <BrandChoiceInput
      {...props}
      labels={{ choose: t("choose"), find: t("find"), none: t("none") }}
    />
  );
};
