import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";
import { content, localized } from "@/lib/data";
import { readPublished } from "@/lib/supabase";

/**
 * "From the Society" (decisions.md, Qirtas): the Society's notices in their
 * own labeled stream, never in News, never bylined, never chosen by editors.
 */
export const FromTheSociety = async ({
  headingClassName = "type-heading",
  locale,
}: {
  readonly headingClassName?: string;
  readonly locale: Locale;
}) => {
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const notices = await readPublished(
    ["journal"],
    (c) => content.societyNotices(c, 3),
    []
  );
  if (notices.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="from-the-society" className="grid gap-4">
      <h2 className={headingClassName} id="from-the-society">
        {t("fromTheSociety")}
      </h2>
      <ul className="grid gap-8 md:grid-cols-3">
        {notices.map((notice) => (
          <li className="grid content-start gap-1" key={notice.id}>
            {notice.link_path ? (
              <Link
                className="type-subheading hover:text-accent"
                href={notice.link_path}
              >
                {localized(notice, "title", locale)}
              </Link>
            ) : (
              <p className="type-subheading">
                {localized(notice, "title", locale)}
              </p>
            )}
            <p className="type-body text-text-secondary">
              {localized(notice, "body", locale)}
            </p>
            {notice.shown_at ? (
              <p className="type-caption text-text-secondary">
                {formatLongDate(notice.shown_at, locale, true)}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      <Link className="link justify-self-start" href="/qirtas/from-the-society">
        {t("fromTheSocietyAll")}
      </Link>
    </section>
  );
};
