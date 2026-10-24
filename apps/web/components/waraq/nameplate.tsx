import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { journal } from "@repo/sal-data";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

/**
 * The paper's nameplate (v6): the name in Medium with the other language's
 * name under it, a dateline between two ink rules, and the desks. Small on
 * the inner pages: the name and the desks.
 */
export const Nameplate = async ({
  current,
  locale,
  note,
  small = false,
}: {
  current?: journal.Desk | "games";
  locale: Locale;
  /** The end of the dateline (an open call, the edition). */
  note?: ReactNode;
  small?: boolean;
}) => {
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const other = locale === "ar" ? "en" : "ar";
  const desk =
    "whitespace-nowrap border-transparent border-b-[1.5px] py-1 font-medium text-[0.90625rem] hover:text-accent aria-[current=page]:border-accent";
  return (
    <header className="grid gap-6">
      {small ? (
        <Link
          className="justify-self-center font-medium text-4xl tracking-tight hover:text-accent"
          href="/waraq"
        >
          {t("title")}
        </Link>
      ) : (
        <>
          <div className="grid justify-items-center pt-4 text-center">
            <Link
              className="font-medium text-[clamp(4.5rem,13vw,10rem)] leading-[0.95] tracking-[-0.04em] hover:text-accent"
              href="/waraq"
            >
              {t("title")}
            </Link>
            <span className="text-4xl sm:text-5xl" dir="auto" lang={other}>
              {t("otherName")}
            </span>
          </div>
          <p className="grid gap-1 border-text border-y py-2.5 font-medium text-[0.8125rem] sm:grid-cols-3 sm:items-center">
            <span>
              {formatLongDate(new Date().toISOString(), locale, true)}
            </span>
            <span className="sm:text-center">{t("tagline")}</span>
            <span className="sm:text-end">{note}</span>
          </p>
        </>
      )}
      <nav
        aria-label={t("sections")}
        className="-mx-4 border-line border-b px-4 pb-3"
      >
        <ul className="flex flex-wrap justify-center gap-x-8 gap-y-2">
          {journal.desks.map((d) => (
            <li key={d}>
              <Link
                aria-current={current === d ? "page" : undefined}
                className={desk}
                href={`/waraq/${d}`}
              >
                {t(`desks.${d}`)}
              </Link>
            </li>
          ))}
          <li>
            <Link className={desk} href="/waraq/editions">
              {t("editions")}
            </Link>
          </li>
          <li>
            <Link
              aria-current={current === "games" ? "page" : undefined}
              className={desk}
              href="/waraq/games"
            >
              {t("games")}
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
};
