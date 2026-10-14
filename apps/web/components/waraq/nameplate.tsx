import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { journal } from "@repo/sal-data";
import { getTranslations } from "next-intl/server";

/** The paper's nameplate and its sections, on every Waraq page. */
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
  return (
    <header className="grid gap-4 border-accent-line border-b pb-4">
      <div className="grid justify-items-center gap-1 text-center">
        <Link className="hover:underline" href="/waraq">
          <span className={small ? "type-heading" : "type-display"}>
            {t("title")}
          </span>
        </Link>
        {small ? null : <p className="type-lede">{t("tagline")}</p>}
        {small ? null : (
          <p className="type-caption">
            {formatLongDate(new Date().toISOString(), locale)}
          </p>
        )}
      </div>
      <nav aria-label={t("sections")}>
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {journal.desks.map((desk) => (
            <li key={desk}>
              <Link
                aria-current={current === desk ? "page" : undefined}
                className="type-label text-sm underline-offset-4 hover:underline aria-[current=page]:underline"
                href={`/waraq/${desk}`}
              >
                {t(`desks.${desk}`)}
              </Link>
            </li>
          ))}
          <li>
            <Link
              className="type-label text-sm underline-offset-4 hover:underline"
              href="/waraq/editions"
            >
              {t("editions")}
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
};
