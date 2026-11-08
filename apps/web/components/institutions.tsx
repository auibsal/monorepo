import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";
import { INSTITUTIONS } from "@/lib/institutions";

/**
 * The home institution, the recognition and the institutional partners,
 * as a row of tiles, each with its logo from AUIB's standard set: in
 * color on paper, in white on ink.
 */
export const Institutions = async ({
  showAll = false,
}: {
  showAll?: boolean;
}) => {
  const t = await getTranslations("web.institutions");

  return (
    <section aria-labelledby="institutions" className="grid gap-6">
      <div className="border-line flex flex-wrap items-baseline justify-between gap-4 border-b pb-2">
        <h2 className="type-heading" id="institutions">
          {t("title")}
        </h2>
        {showAll ? (
          <Link className="link type-caption" href="/partners">
            {t("allPartners")}
          </Link>
        ) : null}
      </div>
      <p className="type-body max-w-3xl">{t("lede")}</p>
      <ul className="gap-space-4 grid sm:grid-cols-2 lg:grid-cols-3">
        {INSTITUTIONS.map((item) => {
          const name = t(`names.${item.key}`);
          const body = (
            <>
              <span className="type-label">{t(`roles.${item.role}`)}</span>
              <span className="py-space-3 grid h-28 items-center justify-items-start">
                {/* biome-ignore lint/performance/noImgElement: a static logo file */}
                <img
                  alt={name}
                  className="on-ink:hidden h-20 w-auto max-w-full object-contain"
                  height={80}
                  src={`/institutions/${item.logo}.svg`}
                  width={236}
                />
                {/* biome-ignore lint/performance/noImgElement: a static logo file */}
                <img
                  alt={name}
                  className="on-ink:block hidden h-20 w-auto max-w-full object-contain"
                  height={80}
                  src={`/institutions/${item.logo}-white.svg`}
                  width={236}
                />
              </span>
            </>
          );
          return (
            <li
              className="border-line p-space-4 grid content-start gap-2 border-t"
              key={item.key}
            >
              {item.url ? (
                <a
                  className="grid gap-2 hover:underline"
                  href={item.url}
                  rel="noopener"
                  target="_blank"
                >
                  {body}
                </a>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
