import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";
import { journal } from "@/lib/data";
import { roughlyNow } from "@/lib/this-year";
import { DeskNav } from "./desk-nav";

/** The paper's name in both languages: the page's own first. */
const NAMES = { ar: "قرطاس", en: "Qirtas" } as const;

/**
 * The paper's nameplate (decisions.md, Qirtas): "Qirtas" with «قرطاس», in
 * Ubuntu Light, a dateline between two ink
 * rules ending in the Masthead, the Editions, Topics and the Prize (decisions.md), and the sections. One nameplate on every page of the paper
 * (decisions.md): it belongs to the Qirtas layout, so it never
 * changes or reloads between the front page, a section and a piece.
 */
export const Nameplate = async ({ locale }: { locale: Locale }) => {
  const t = await getTranslations({ locale, namespace: "web.journal" });
  return (
    <header className="grid gap-6">
      <div className="grid justify-items-center gap-1 pt-4 text-center">
        <Link
          className="hover:text-accent text-[clamp(4.5rem,13vw,10rem)] leading-[0.95] font-light tracking-[-0.04em]"
          href="/qirtas"
        >
          {t("title")}
        </Link>
        <span
          className="text-text-secondary text-[clamp(1.5rem,3vw,2.25rem)] font-light"
          dir={locale === "ar" ? "ltr" : "rtl"}
          lang={locale === "ar" ? "en" : "ar"}
        >
          {locale === "ar" ? NAMES.en : NAMES.ar}
        </span>
      </div>
      <p className="border-text grid gap-1 border-y py-2.5 text-[0.8125rem] font-medium sm:grid-cols-3 sm:items-center">
        <span>
          {formatLongDate(
            new Date(await roughlyNow()).toISOString(),
            locale,
            true
          )}
        </span>
        <span className="sm:text-center">{t("tagline")}</span>
        <span className="flex flex-wrap gap-x-5 sm:justify-end">
          <Link className="hover:text-accent" href="/qirtas/masthead">
            {t("masthead.link")}
          </Link>
          <Link className="hover:text-accent" href="/qirtas/editions">
            {t("editions")}
          </Link>
          <Link className="hover:text-accent" href="/qirtas/prize">
            {t("prize")}
          </Link>
        </span>
      </p>
      <DeskNav
        desks={journal.desks.map((d) => ({ key: d, name: t(`desks.${d}`) }))}
        label={t("sections")}
      />
    </header>
  );
};
