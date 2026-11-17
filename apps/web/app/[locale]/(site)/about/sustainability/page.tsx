import { formatNumber } from "@repo/internationalization/format";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, RuledList } from "@/components/section";
import { PAPER_CALCULATOR } from "@/lib/data/paper";
import { type LocaleParams, sectionMetadata } from "@/lib/page";
import { readPublished } from "@/lib/supabase";

export const generateMetadata = sectionMetadata(
  "web.sustainability",
  "/about/sustainability"
);

/** What the Society does for the environment (decisions.md, Sustainability). */
const PRACTICES = [
  "digital",
  "need",
  "editions",
  "reuse",
  "days",
  "web",
] as const;

/** The paper the counted sheets stand for, once the calculator's figures are in. */
const paperFigures = (sheets: number) => {
  const per = PAPER_CALCULATOR.perSheet;
  return per
    ? ([
        ["wood", per.woodLbs * sheets],
        ["water", per.waterGallons * sheets],
        ["co2e", per.co2eLbs * sheets],
      ] as const)
    : [];
};

const SustainabilityPage = async ({ params }: LocaleParams) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.sustainability" });
  const ta = await getTranslations({ locale, namespace: "web.about" });
  const paper = await readPublished(
    ["about"],
    async (c) => {
      const { data } = await c
        .schema("api")
        .rpc("paper_numbers", undefined, { get: true });
      return data?.[0] ?? null;
    },
    null
  );
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:py-24">
      <PageHeader lede={t("lede")} title={t("title")} />
      {paper ? (
        <>
          <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {(
              [
                ["signed", paper.documents_signed],
                ["sheets", paper.sheets_not_printed],
                ...paperFigures(paper.sheets_not_printed),
              ] as const
            )
              .filter(([, value]) => value > 0)
              .map(([key, value]) => (
                <div className="border-line grid gap-1 border-t pt-3" key={key}>
                  <dt className="type-caption text-text-secondary">
                    {ta(`paper.${key}`)}
                  </dt>
                  <dd className="text-4xl font-light">
                    {formatNumber(Math.round(value), locale)}
                  </dd>
                </div>
              ))}
          </dl>
          <p className="type-caption">
            {ta("paperNote")}
            {PAPER_CALCULATOR.perSheet
              ? ` ${ta("paperSource", { version: PAPER_CALCULATOR.version })}`
              : ""}
          </p>
        </>
      ) : null}
      <RuledList
        columns={3}
        items={PRACTICES.map((key) => ({
          body: ta(`practices.${key}.body`),
          key,
          title: ta(`practices.${key}.title`),
        }))}
      />
      <div className="grid max-w-[60ch] gap-2">
        <h2 className="type-heading">{ta("greenTitle")}</h2>
        <p className="type-body">{ta("green")}</p>
        <p className="type-caption">{ta("greenSources")}</p>
      </div>
    </div>
  );
};

export default SustainabilityPage;
