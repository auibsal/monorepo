import { cn } from "@repo/brand/lib/utils";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";
import { INSTITUTIONS } from "@/lib/institutions";

/**
 * The home institution, the recognition and the institutional partners,
 * as a row of tiles, each with its official logo on the ground it was
 * made for.
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
              <span
                className={cn(
                  "p-space-3 grid h-24 place-items-center",
                  item.ground === "ink" ? "bg-footer" : "bg-surface"
                )}
                // A color logo keeps its paper in the dark theme too.
                data-theme={item.ground === "paper" ? "light" : undefined}
              >
                {/* biome-ignore lint/performance/noImgElement: a static logo file, as supplied */}
                <img
                  alt={name}
                  className="h-14 w-auto max-w-full object-contain"
                  height={56}
                  src={item.logo}
                  width={180}
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
