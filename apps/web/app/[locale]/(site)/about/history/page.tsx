import { formatLongDate } from "@repo/internationalization/format";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/section";
import { type LocaleParams, sectionMetadata } from "@/lib/page";

export const generateMetadata = sectionMetadata(
  "web.history",
  "/about/history"
);

/**
 * The Society's history as it happened (decisions.md, Where the Society
 * stands), a dated line each. The Society is founded at the Founding
 * Meeting; nothing here dates an adoption before it.
 */
const BEGAN = [
  ["registered", null],
  ["tour", "2026-02-08"],
  ["fair", "2026-02-23"],
  ["fall", "2026-10-05"],
  ["launch", "2026-11-08"],
  ["founding", "2027-03-30"],
] as const;

const HistoryPage = async ({ params }: LocaleParams) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.history" });
  const ta = await getTranslations({ locale, namespace: "web.about" });
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:py-24">
      <PageHeader lede={t("lede")} title={t("title")} />
      <ol className="border-line grid border-b">
        {BEGAN.map(([key, day]) => (
          <li
            className="border-line grid gap-1 border-t py-3 sm:grid-cols-[16rem_1fr] sm:gap-x-6"
            key={key}
          >
            {day ? (
              <time className="type-caption text-text-secondary" dateTime={day}>
                {formatLongDate(`${day}T12:00:00+03:00`, locale, true)}
              </time>
            ) : (
              <span className="type-caption text-text-secondary">
                {ta("spring2026")}
              </span>
            )}
            <span className="type-body">{ta(`began.${key}`)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default HistoryPage;
