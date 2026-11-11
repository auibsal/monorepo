import type { Locale } from "@repo/internationalization";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GetInvolvedLinks } from "@/components/account/get-involved-links";
import { OpenPlaces } from "@/components/account/open-places";
import { DiwanPage } from "@/components/diwan/page";
import { programmes } from "@/lib/data";
import { titleFrom } from "@/lib/diwan/metadata";
import { readPublished } from "@/lib/supabase";

const metadataFrom = titleFrom((t) => t("diwan.getInvolved.title"));

/** Public, unlike the members' pages: search engines may list it. */
export const generateMetadata: typeof metadataFrom = async (props) => ({
  ...(await metadataFrom(props)),
  robots: { follow: true, index: true },
});

interface PageProps {
  readonly params: Promise<{ locale: Locale }>;
}

/**
 * Get involved (decisions.md, Get involved and roles): open roles only, rendered on the
 * server so the list is there without JavaScript. Each opening has its
 * own page, where members apply.
 */
const GetInvolvedPage = async ({ params }: PageProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "diwan.getInvolved" });
  const places = await readPublished(
    ["programmes"],
    (client) => programmes.openPlaces(client),
    []
  );
  return (
    <DiwanPage lede={t("lede")} title={t("title")}>
      <GetInvolvedLinks />
      <OpenPlaces locale={locale} places={places} />
    </DiwanPage>
  );
};

export default GetInvolvedPage;
