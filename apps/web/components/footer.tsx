import { BrandLogo } from "@repo/design-system/components/brand-logo";
import { localizedPath } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import NextLink from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CookieSettings } from "@/components/cookie-settings";
import { askedConsent } from "@/lib/consent";

const INSTAGRAM = "https://www.instagram.com/auibsal";

interface FooterProps {
  /** The cookie settings link: only where the consent card runs (the site). */
  readonly consent?: boolean;
}

const linkClass = "hover:text-accent hover:underline hover:underline-offset-4";

/**
 * The one footer for the whole site, public pages and the portal alike:
 * ink in both modes. The reversed lockup in the page's language and one sentence,
 * three short columns (Society, Read, Contact) under rose labels, then a
 * hairline and the fine print, which keeps the policies and cookie settings
 * within reach.
 */
export const Footer = async ({ consent = true }: FooterProps = {}) => {
  const t = await getTranslations("web.footer");
  const tn = await getTranslations("web.nav");
  const tx = await getTranslations("web.footerExtra");
  const locale = await getLocale();
  const email = t("columns.email");

  const columns = [
    {
      heading: t("columns.society"),
      links: [
        ["/about", tn("about")],
        ["/governance", t("governance")],
        ["/documents", tn("documents")],
        ["/partners", t("partners")],
        ["/give", tn("give")],
      ],
    },
    {
      heading: t("columns.read"),
      links: [
        ["/qirtas", tn("journal")],
        ["/qirtas/news", tn("news")],
        ["/newsletter", t("newsletter")],
        ["/programs/productions", t("productions")],
        ["/search", t("search")],
      ],
    },
  ] as const;

  const fine = [
    ["/privacy", t("privacy")],
    ["/documents/terms-of-use", t("terms")],
    ["/documents/accessibility", t("accessibility")],
    ["/programs/side-quest/care", t("sideQuestCare")],
  ] as const;

  return (
    <footer className="bg-footer text-text print:hidden" data-theme="dark">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 pt-14 pb-10 text-[0.90625rem] sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-8">
        <div className="grid content-start gap-4 sm:col-span-2 lg:col-span-1">
          <NextLink
            className="justify-self-start"
            href={localizedPath(locale, "/")}
          >
            <BrandLogo className="h-14" height={56} locale={locale} />
          </NextLink>
          <p className="max-w-[34ch] text-text-secondary">
            {tx("recognition")}
          </p>
        </div>
        {columns.map((column) => (
          <div className="grid content-start gap-3.5" key={column.heading}>
            <h2 className="type-label text-accent">{column.heading}</h2>
            <ul className="grid gap-2">
              {column.links.map(([href, label]) => (
                <li key={href}>
                  <Link className={linkClass} href={href}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="grid content-start gap-3.5">
          <h2 className="type-label text-accent">
            {t("columns.contactHeading")}
          </h2>
          <ul className="grid gap-2">
            <li>
              <a className={linkClass} href={`mailto:${email}`}>
                {email}
              </a>
            </li>
            <li>
              <a
                className={linkClass}
                href={INSTAGRAM}
                rel="noopener"
                target="_blank"
              >
                {tx("instagram")} @auibsal
              </a>
            </li>
            <li>
              <Link className={linkClass} href="/contact">
                {t("contact")}
              </Link>
            </li>
            <li>
              <Link className={linkClass} href="/media-kit">
                {t("mediaKit")}
              </Link>
            </li>
            <li>
              <NextLink
                className={linkClass}
                href={localizedPath(locale, "/account")}
              >
                {tn("account")}
              </NextLink>
            </li>
          </ul>
        </div>
        <div className="flex flex-col gap-3 border-line border-t pt-5 text-[0.8125rem] text-text-secondary sm:col-span-2 lg:col-span-4 lg:flex-row lg:flex-wrap lg:items-baseline lg:justify-between">
          <p>{tx("copyright", { year: String(new Date().getFullYear()) })}</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {fine.map(([href, label]) => (
              <li key={href}>
                <Link className={linkClass} href={href}>
                  {label}
                </Link>
              </li>
            ))}
            {consent && Object.values(askedConsent()).some(Boolean) ? (
              <CookieSettings />
            ) : null}
          </ul>
          <p>{tx("colophon")}</p>
        </div>
      </div>
    </footer>
  );
};
