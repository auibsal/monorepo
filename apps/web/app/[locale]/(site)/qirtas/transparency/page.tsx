import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localizedMetadata } from "@/lib/metadata";

interface TransparencyProps {
  readonly params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: TransparencyProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.journal" });
  return localizedMetadata(locale, "/qirtas/transparency", {
    description: t("transparency.lede"),
    title: `${t("transparency.title")} · ${t("title")}`,
  });
};

/**
 * Qirtas's transparency report (decisions.md, Frameworks followed:
 * Publishing): the disclosures of the Journalism Trust Initiative's
 * standard (CWA 17493), in its order: who owns Qirtas, how it is paid
 * for, who decides, the standards it keeps, and how to reach it.
 * Linked from the masthead.
 */
const PARTS = [
  ["owner", null],
  ["money", null],
  ["independence", null],
  ["decides", "/qirtas/masthead"],
  ["standards", "/library/editorial-standards"],
  ["corrections", "/qirtas/corrections"],
  ["contact", "/about/contact"],
] as const;

const TransparencyPage = async ({ params }: TransparencyProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({
    locale,
    namespace: "web.journal.transparency",
  });
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-10">
      <header className="grid gap-2">
        <h1 className="type-display">{t("title")}</h1>
        <p className="type-lede">{t("lede")}</p>
      </header>
      <dl className="grid">
        {PARTS.map(([key, href]) => (
          <div
            className="border-line grid gap-2 border-t py-5 sm:grid-cols-[1fr_2fr] sm:gap-6"
            key={key}
          >
            <dt className="type-heading">{t(`parts.${key}.title`)}</dt>
            <dd className="type-body grid gap-2">
              <p>{t(`parts.${key}.body`)}</p>
              {href ? (
                <Link className="link justify-self-start" href={href}>
                  {t(`parts.${key}.link`)}
                </Link>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
      <p className="type-caption">{t("standard")}</p>
    </div>
  );
};

export default TransparencyPage;
