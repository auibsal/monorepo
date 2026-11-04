import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  issueContents,
  SundayPaperIssue,
} from "@/components/sunday-paper-issue";
import { localizedMetadata } from "@/lib/metadata";
import { issueOf } from "@/lib/sunday-paper";

interface IssueProps {
  readonly params: Promise<{ locale: Locale; month: string }>;
}

const MONTH = /^(\d{4})-(\d{2})$/;

/** The issue a `yyyy-mm` segment names, when it has been sent. */
const issueFrom = (segment: string) => {
  const match = MONTH.exec(segment);
  const year = Number(match?.[1]);
  const month = Number(match?.[2]);
  if (!match || Math.min(Math.max(month, 1), 12) !== month || year < 2026) {
    return null;
  }
  const issue = issueOf(year, month - 1);
  return issue.sunday <= new Date() ? issue : null;
};

export const generateMetadata = async ({
  params,
}: IssueProps): Promise<Metadata> => {
  const { locale, month } = await params;
  const issue = issueFrom(month);
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
  const issue = issueFrom(month);
  if (!issue) {
    notFound();
  }
  // An issue that carried nothing was never sent.
  const { events, pieces } = await issueContents(issue, locale);
  if (events.length + pieces.length === 0) {
    notFound();
  }
  return <SundayPaperIssue issue={issue} locale={locale} />;
};

export default IssuePage;
