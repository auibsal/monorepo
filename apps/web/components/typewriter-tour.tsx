import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { getTranslations } from "next-intl/server";
import { Section } from "@/components/section";
import { TypingToy } from "@/components/typing-toy";
import { programmes } from "@/lib/data";
import { readPublished } from "@/lib/supabase";

/**
 * The Typewriter Tour's six words (decisions.md, Members): each page is
 * its writer's and private, so the Tour's page shows counts only; and a
 * typewriter to try, which keeps nothing.
 */
export const TypewriterTourWall = async ({
  locale,
}: {
  readonly locale: Locale;
}) => {
  const t = await getTranslations({ locale, namespace: "web.tour" });
  const counts = await readPublished(
    ["programmes"],
    (c) => programmes.sixWordsCounts(c),
    { pages: 0, writers: 0 }
  );
  return (
    <>
      {Number(counts.pages) > 0 ? (
        <Section id="six-words" title={t("wall")}>
          <p className="type-body max-w-[60ch]">
            {t("counts", {
              pages: formatNumber(Number(counts.pages)),
              writers: formatNumber(Number(counts.writers)),
            })}
          </p>
        </Section>
      ) : null}
      <Section id="try" title={t("try")}>
        <TypingToy />
      </Section>
    </>
  );
};
