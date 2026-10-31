import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { journal } from "@repo/sal-data";
import { getTranslations } from "next-intl/server";

/**
 * The paper's nameplate: the name in Medium, a dateline between two ink
 * rules ending in the Editions and the Awards (owner, Oct 31, 2026: they
 * take the place of the call's closing date), and the desks. Small on the
 * inner pages: the name and the sections, with Editions and Awards after
 * them.
 */
export const Nameplate = async ({
  current,
  locale,
  small = false,
}: {
  current?: journal.Desk;
  locale: Locale;
  small?: boolean;
}) => {
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const desk =
    "whitespace-nowrap border-transparent border-b-[1.5px] py-1 font-medium text-[0.90625rem] hover:text-accent aria-[current=page]:border-accent";
  return (
    <header className="grid gap-6">
      {small ? (
        <Link
          className="justify-self-center font-medium text-4xl tracking-tight hover:text-accent"
          href="/qirtas"
        >
          {t("title")}
        </Link>
      ) : (
        <>
          <div className="grid justify-items-center pt-4 text-center">
            <Link
              className="font-medium text-[clamp(4.5rem,13vw,10rem)] leading-[0.95] tracking-[-0.04em] hover:text-accent"
              href="/qirtas"
            >
              {t("title")}
            </Link>
          </div>
          <p className="grid gap-1 border-text border-y py-2.5 font-medium text-[0.8125rem] sm:grid-cols-3 sm:items-center">
            <span>
              {formatLongDate(new Date().toISOString(), locale, true)}
            </span>
            <span className="sm:text-center">{t("tagline")}</span>
            <span className="flex gap-x-5 sm:justify-end">
              <Link className="hover:text-accent" href="/qirtas/editions">
                {t("editions")}
              </Link>
              <Link className="hover:text-accent" href="/qirtas/awards">
                {t("prizes")}
              </Link>
            </span>
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
                href={`/qirtas/${d}`}
              >
                {t(`desks.${d}`)}
              </Link>
            </li>
          ))}
          {small ? (
            <>
              <li>
                <Link className={desk} href="/qirtas/editions">
                  {t("editions")}
                </Link>
              </li>
              <li>
                <Link className={desk} href="/qirtas/awards">
                  {t("prizes")}
                </Link>
              </li>
            </>
          ) : null}
        </ul>
      </nav>
    </header>
  );
};
