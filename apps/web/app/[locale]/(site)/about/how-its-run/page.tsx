import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, RuledList } from "@/components/section";
import { type LocaleParams, sectionMetadata } from "@/lib/page";

export const generateMetadata = sectionMetadata(
  "web.howRun",
  "/about/how-its-run"
);

/** How the Society is run (decisions.md, The site: About), in the order a newcomer asks. */
const RUN = [
  "open",
  "council",
  "elections",
  "editors",
  "money",
  "process",
  "rules",
] as const;

const HowItsRunPage = async ({ params }: LocaleParams) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.howRun" });
  const ta = await getTranslations({ locale, namespace: "web.about" });
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:py-24">
      <PageHeader lede={t("lede")} title={t("title")} />
      <RuledList
        columns={3}
        items={RUN.map((key) => ({
          body: ta(`run.${key}.body`),
          key,
          title: ta(`run.${key}.title`),
        }))}
      />
      <p className="type-body max-w-[60ch]">{ta("nonPartisan")}</p>
    </div>
  );
};

export default HowItsRunPage;
