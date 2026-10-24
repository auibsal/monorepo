import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { journal, localized } from "@repo/sal-data";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Nameplate } from "@/components/waraq/nameplate";
import { mediaUrl } from "@/lib/media";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

interface EditionsProps {
  readonly params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: EditionsProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.journal" });
  return localizedMetadata(locale, "/qirtas/editions", {
    description: t("editionsLede"),
    title: `${t("editions")} · ${t("title")}`,
  });
};

const EditionsPage = async ({ params }: EditionsProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const editions = await readPublished(
    ["journal"],
    async (c) => (await journal.publishedIssues(c)) ?? [],
    []
  );
  const out = editions.filter(
    (e) => e.status === "published" && e.published_at
  );
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10">
      <Nameplate locale={locale} small />
      <header className="grid gap-2">
        <h1 className="type-display">{t("editions")}</h1>
        <p className="type-lede max-w-3xl">{t("editionsLede")}</p>
      </header>
      {out.length === 0 ? (
        <p className="type-body text-text-secondary">{t("noEditions")}</p>
      ) : (
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {out.map((edition) => {
            const cover = mediaUrl(edition.cover_path);
            return (
              <li key={edition.id}>
                <Link
                  className="grid gap-2 hover:underline"
                  href={`/qirtas/editions/${edition.slug}`}
                >
                  {cover ? (
                    // biome-ignore lint/performance/noImgElement: a published image from the media bucket
                    <img
                      alt={t("coverAlt")}
                      className="w-full"
                      height={800}
                      loading="lazy"
                      src={cover}
                      width={600}
                    />
                  ) : null}
                  <span className="type-heading">
                    {localized(edition, "title", locale)}
                  </span>
                  {localized(edition, "season", locale) ? (
                    <span className="type-caption">
                      {localized(edition, "season", locale)}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default EditionsPage;
