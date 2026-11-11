import type { Locale } from "@repo/internationalization";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { ReportProblem } from "@/components/account/report-problem";
import { DiwanPage } from "@/components/diwan/page";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("diwan.report.title"));

interface PageProps {
  readonly params: Promise<{ locale: Locale }>;
}

/** /help/report: "Report a problem", linked from every page's footer. */
const ReportPage = async ({ params }: PageProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "diwan.report" });
  return (
    <DiwanPage lede={t("lede")} narrow title={t("title")}>
      <Suspense>
        <ReportProblem />
      </Suspense>
    </DiwanPage>
  );
};

export default ReportPage;
