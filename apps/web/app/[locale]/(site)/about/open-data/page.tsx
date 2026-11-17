import { apiPath } from "@repo/internationalization/config";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, RuledList } from "@/components/section";
import { DATASETS } from "@/lib/api/open-data";
import { type LocaleParams, sectionMetadata } from "@/lib/page";

export const generateMetadata = sectionMetadata(
  "web.openData",
  "/about/open-data"
);

/**
 * Open data (decisions.md, Frameworks followed: Governance and openness):
 * the Society's public numbers, free to reuse (CC0), each as JSON and CSV
 * from the API.
 */
const OpenDataPage = async ({ params }: LocaleParams) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.openData" });
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-12 px-4 py-16 sm:py-24">
      <PageHeader lede={t("lede")} title={t("title")} />
      <RuledList
        columns={1}
        items={DATASETS.map((key) => ({
          body: (
            <span className="grid gap-2">
              <span>{t(`sets.${key}`)}</span>
              <span className="flex flex-wrap gap-x-5 gap-y-1">
                <a className="link" href={apiPath(`/open-data/${key}.json`)}>
                  {t("json")}
                </a>
                <a className="link" href={apiPath(`/open-data/${key}.csv`)}>
                  {t("csv")}
                </a>
              </span>
            </span>
          ),
          key,
          title: t(`titles.${key}`),
        }))}
      />
      <p className="type-body max-w-[60ch]">
        {t("license")}{" "}
        <a
          className="link"
          href="https://creativecommons.org/publicdomain/zero/1.0/"
          rel="license"
        >
          {t("cc0")}
        </a>
      </p>
    </div>
  );
};

export default OpenDataPage;
