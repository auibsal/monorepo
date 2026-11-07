import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { journal } from "@repo/sal-data";
import { getTranslations } from "next-intl/server";
import { DeskNav } from "./desk-nav";

/**
 * The paper's nameplate: the name in Medium, a dateline between two ink
 * rules ending in the Masthead, the Editions, Topics and the Prize (owner, Oct 31,
 * 2026), and the sections. One nameplate on every page of the paper
 * (owner, Nov 5, 2026): it belongs to the Qirtas layout, so it never
 * changes or reloads between the front page, a section and a piece.
 */
export const Nameplate = async ({ locale }: { locale: Locale }) => {
  const t = await getTranslations({ locale, namespace: "web.journal" });
  return (
    <header className="grid gap-6">
      <div className="grid justify-items-center pt-4 text-center">
        <Link
          className="font-medium text-[clamp(4.5rem,13vw,10rem)] leading-[0.95] tracking-[-0.04em] hover:text-accent"
          href="/qirtas"
        >
          {t("title")}
        </Link>
      </div>
      <p className="grid gap-1 border-text border-y py-2.5 font-medium text-[0.8125rem] sm:grid-cols-3 sm:items-center">
        <span>{formatLongDate(new Date().toISOString(), locale, true)}</span>
        <span className="sm:text-center">{t("tagline")}</span>
        <span className="flex flex-wrap gap-x-5 sm:justify-end">
          <Link className="hover:text-accent" href="/qirtas/masthead">
            {t("masthead.link")}
          </Link>
          <Link className="hover:text-accent" href="/qirtas/editions">
            {t("editions")}
          </Link>
          <Link className="hover:text-accent" href="/qirtas/topics">
            {t("topics")}
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
