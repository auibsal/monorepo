import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";
import { INSTITUTIONS } from "@/lib/institutions";

/**
 * The home institution, the recognition and the institutional partners,
 * as a row of tiles: the official logo when one is supplied, the name
 * otherwise.
 */
export const Institutions = async ({
  showAll = false,
}: {
  showAll?: boolean;
}) => {
  const t = await getTranslations("web.institutions");

  return (
    <section aria-labelledby="institutions" className="grid gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-line border-b pb-2">
        <h2 className="type-heading" id="institutions">
          {t("title")}
        </h2>
        {showAll ? (
          <Link className="link type-caption" href="/about/partners">
            {t("allPartners")}
          </Link>
        ) : null}
      </div>
      <p className="type-body max-w-3xl">{t("lede")}</p>
      <ul className="grid gap-space-4 sm:grid-cols-2 lg:grid-cols-4">
        {INSTITUTIONS.map((item) => {
          const name = t(`names.${item.key}`);
          const body = (
            <>
              <span className="type-label">{t(`roles.${item.role}`)}</span>
              {item.logo ? (
                // biome-ignore lint/performance/noImgElement: a static logo file, as supplied
                <img
                  alt={name}
                  className="h-12 w-auto justify-self-start object-contain"
                  height={48}
                  src={item.logo}
                  width={160}
                />
              ) : (
                <span className="type-subheading">{name}</span>
              )}
            </>
          );
          return (
            <li
              className="grid content-start gap-2 border-line border-t p-space-4"
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
