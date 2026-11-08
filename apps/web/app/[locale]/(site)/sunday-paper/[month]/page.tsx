import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pastIssues, SundayPaperIssue } from "@/components/sunday-paper-issue";
import { localizedMetadata } from "@/lib/metadata";
import { PLACEHOLDER_SLUG } from "@/lib/placeholder";

// Made on its first visit (its address names a record), then kept until
// it is published again.
export const instant = false;
// The placeholder (never a real address) gives the route a shell, so a
// missing record answers 404 before anything streams.
export const generateStaticParams = () => [{ month: PLACEHOLDER_SLUG }];

interface IssueProps {
  readonly params: Promise<{ locale: Locale; month: string }>;
}

const MONTH = /^(\d{4})-(\d{2})$/u;

/** The issue a `yyyy-mm` segment names, when it has been sent. */
const issueFrom = async (segment: string) => {
  if (!MONTH.test(segment)) {
    return null;
  }
  const sent = await pastIssues();
  return sent.find((issue) => issue.key === segment) ?? null;
};

export const generateMetadata = async ({
  params,
}: IssueProps): Promise<Metadata> => {
  const { locale, month } = await params;
  const issue = await issueFrom(month);
  if (!issue) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "web.newsletter" });
  return localizedMetadata(locale, `/sunday-paper/${issue.key}`, {
    description: t("lede"),
    title: `${t("title")} · ${formatLongDate(issue.sunday, locale)}`,
  });
};

/** One issue of the Sunday Paper, /sunday-paper/<yyyy-mm> (design review C17). */
const IssuePage = async ({ params }: IssueProps) => {
  const { locale, month } = await params;
  setRequestLocale(locale);
  const issue = await issueFrom(month);
  if (!issue) {
    notFound();
  }
  return <SundayPaperIssue issue={issue} locale={locale} />;
};

export default IssuePage;
