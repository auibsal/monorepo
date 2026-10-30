"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

/**
 * Removing and canceling, asked in place without a dialog: the text link
 * becomes "Cancel this booking? Cancel booking · Keep it".
 */
export const InlineConfirm = ({
  confirm,
  disabled,
  label,
  onConfirm,
  question,
}: {
  /** The words on the button that does it ("Cancel booking"). */
  readonly confirm: string;
  readonly disabled?: boolean;
  readonly label: string;
  readonly onConfirm: () => void;
  readonly question: string;
}) => {
  const t = useTranslations("common");
  const [asking, setAsking] = useState(false);
  const link =
    "font-medium underline underline-offset-4 hover:text-accent disabled:opacity-60";
  if (!asking) {
    return (
      <button
        className={link}
        disabled={disabled}
        onClick={() => setAsking(true)}
        type="button"
      >
        {label}
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span>{question}</span>
      <button
        className={link}
        disabled={disabled}
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
        type="button"
      >
        {confirm}
      </button>
      <button className={link} onClick={() => setAsking(false)} type="button">
        {t("keep")}
      </button>
    </span>
  );
};
