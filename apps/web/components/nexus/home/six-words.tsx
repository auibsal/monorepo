"use client";

import { useTranslations } from "next-intl";
import { useMySixWords } from "@/lib/nexus/queries";
import { Section } from "./section";

/**
 * The member's six words in the Register. They are written only on the
 * Typewriter Tour (owner, 2026-10-25): officers transcribe the card and a
 * scan of the member's card attaches it here. A new card replaces the
 * old one. Shown only once there is one (the overhaul, Oct 30, 2026); the
 * Tour's own page says how to write one.
 */
export const SixWords = () => {
  const t = useTranslations("nexus.home.sixWords");
  const entry = useMySixWords();
  if (!entry.data) {
    return null;
  }

  return (
    <Section description={t("description")} id="six-words" title={t("title")}>
      <blockquote
        className="type-heading font-light"
        dir="auto"
        lang={entry.data.language}
      >
        {entry.data.text}
      </blockquote>
      {entry.data?.status === "rejected" ? (
        <p className="type-caption">{t("takenDown")}</p>
      ) : null}
    </Section>
  );
};
