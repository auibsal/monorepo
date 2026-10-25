"use client";

import { useTranslations } from "next-intl";
import { useMySixWords } from "@/lib/nexus/queries";
import { EmptyLine } from "../states";
import { Section } from "./section";

/**
 * The member's six words in the Register. They are written only on the
 * Typewriter Tour (owner, 2026-10-25): officers transcribe the card and a
 * scan of the member's card attaches it here. A new card replaces the
 * old one.
 */
export const SixWords = () => {
  const t = useTranslations("nexus.home.sixWords");
  const entry = useMySixWords();

  return (
    <Section description={t("description")} id="six-words" title={t("title")}>
      {entry.data ? (
        <blockquote
          className="type-heading font-light"
          dir="auto"
          lang={entry.data.language}
        >
          {entry.data.text}
        </blockquote>
      ) : null}
      {entry.data?.status === "rejected" ? (
        <p className="type-caption">{t("takenDown")}</p>
      ) : null}
      {entry.isSuccess && !entry.data ? (
        <EmptyLine
          action={{
            href: "/events/typewriter-tour",
            label: t("tour"),
            site: true,
          }}
        >
          {t("empty")}
        </EmptyLine>
      ) : null}
    </Section>
  );
};
