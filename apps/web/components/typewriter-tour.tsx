import type { Locale } from "@repo/internationalization";
import { localized, programmes } from "@repo/sal-data";
import { getTranslations } from "next-intl/server";
import { Section } from "@/components/section";
import { TypingToy } from "@/components/typing-toy";
import { readPublished } from "@/lib/supabase";

/**
 * The Typewriter Tour's Six Words wall (the design review A29, Nov 4,
 * 2026): the cards transcribed from the Tour (`programmes.six_words_wall`,
 * approved only), in the page's language, set in Ubuntu Mono like the
 * typewriter; and a typewriter to try, which keeps nothing (A30).
 */
export const TypewriterTourWall = async ({
  locale,
}: {
  readonly locale: Locale;
}) => {
  const t = await getTranslations({ locale, namespace: "web.programs.page" });
  const wall = (
    await readPublished(
      ["programmes"],
      (c) => programmes.sixWordsWall(c, 120),
      []
    )
  ).filter((entry) => entry.language === locale);
  return (
    <>
      {wall.length > 0 ? (
        <Section id="six-words" title={t("wall")}>
          <ul className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
            {wall.map((entry) => (
              <li
                className="grid content-start gap-1 border-line border-t py-space-4"
                key={entry.id}
              >
                <p className="font-mono text-lg">{entry.text}</p>
                {localized(entry, "author", locale) ? (
                  <p className="type-caption text-text-secondary">
                    {localized(entry, "author", locale)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      <Section id="try" title={t("try")}>
        <TypingToy />
      </Section>
    </>
  );
};
