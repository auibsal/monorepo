import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";
import { NewsletterSignup } from "@/components/newsletter/signup";
import { journal } from "@/lib/data";

/**
 * After a piece (decisions.md): the two things a reader who finished
 * it may want next, side by side and quiet (text links, no solid button):
 * to write for the section they just read, and the Sunday Paper. Games take
 * no work from readers, so its pieces end with the Sunday Paper alone.
 */
export const PieceEnd = async ({
  desk,
  locale,
}: {
  desk: journal.Desk;
  locale: Locale;
}) => {
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const sends = journal.sendableCategories(desk).length > 0;
  return (
    <aside
      aria-label={t("end.label")}
      className="border-line mx-auto grid w-full max-w-3xl gap-8 border-t px-4 pt-8 md:grid-cols-2 print:hidden"
    >
      {sends ? (
        <div className="grid content-start gap-2">
          <h2 className="type-heading">{t("sendNews")}</h2>
          <p className="type-body">
            {t("end.write", { desk: t(`desks.${desk}`) })}
          </p>
          <Link
            className="link justify-self-start"
            href={`/qirtas/write#${desk}`}
          >
            {t("end.writeLink")}
          </Link>
        </div>
      ) : null}
      <div className="grid content-start gap-2">
        <h2 className="type-heading">{t("newsletter")}</h2>
        <p className="type-body">{t("newsletterLede")}</p>
        <NewsletterSignup compact />
      </div>
    </aside>
  );
};
