import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { WhatsOn } from "@/components/whats-on-page";
import { localizedMetadata } from "@/lib/metadata";
import { isMonthSegment, monthFrom } from "@/lib/whats-on";

interface PartProps {
  readonly params: Promise<{ locale: Locale; part: string; slug: string }>;
}

export const generateMetadata = async ({
  params,
}: PartProps): Promise<Metadata> => {
  const { locale, part, slug } = await params;
  if (isMonthSegment(slug) && part === "society") {
    const t = await getTranslations({ locale, namespace: "web.events" });
    return localizedMetadata(locale, `/events/${slug}/society`, {
      description: t("lede"),
      title: t("title"),
    });
  }
  return {};
};

/**
 * Under a month's address: What's on with the Society's dates alone
 * (/events/2026-11/society). Events have no other pages under them (owner,
 * Nov 7, 2026: the book fair's catalog and impact report are retired with
 * the charity collection).
 */
const PartPage = async ({ params }: PartProps) => {
  const { locale, part, slug } = await params;
  setRequestLocale(locale);
  if (!(isMonthSegment(slug) && part === "society")) {
    notFound();
  }
  return (
    <WhatsOn locale={locale} month={monthFrom(slug)} withUniversity={false} />
  );
};

export default PartPage;
