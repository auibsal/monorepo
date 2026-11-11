import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ApplyForm } from "@/components/account/apply-form";
import { DiwanPage, DiwanSection } from "@/components/diwan/page";
import { localized, programmes } from "@/lib/data";
import { titleFrom } from "@/lib/diwan/metadata";
import { readPublished } from "@/lib/supabase";

export const generateMetadata = titleFrom((t) => t("diwan.getInvolved.title"));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

interface PageProps {
  readonly params: Promise<{ locale: Locale; opening: string }>;
}

/**
 * One opening (decisions §18): what it is, who may apply and when it
 * closes, then the application, for members.
 */
const OpeningPage = async ({ params }: PageProps) => {
  const { locale, opening } = await params;
  setRequestLocale(locale);
  if (!UUID.test(opening)) {
    notFound();
  }
  const place = await readPublished(
    ["programmes"],
    (client) => programmes.openPlace(client, opening),
    null
  );
  if (!place) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "diwan.getInvolved" });
  const lang = locale;
  const row: Record<string, unknown> = { ...place };
  return (
    <DiwanPage
      lede={
        place.closes_at
          ? t("closes", { date: formatLongDate(place.closes_at, lang) })
          : undefined
      }
      narrow
      title={localized(row, "title", lang)}
    >
      {localized(row, "body", lang) ? (
        <p className="type-body whitespace-pre-line">
          {localized(row, "body", lang)}
        </p>
      ) : null}
      {localized(row, "eligibility", lang) ? (
        <DiwanSection id="eligibility" title={t("eligibility")}>
          <p className="type-body">{localized(row, "eligibility", lang)}</p>
        </DiwanSection>
      ) : null}
      <ApplyForm
        askFiles={place.asks_files}
        director={place.director}
        openingId={place.id}
        questions={programmes.questionsOf(place.questions)}
      />
    </DiwanPage>
  );
};

export default OpeningPage;
