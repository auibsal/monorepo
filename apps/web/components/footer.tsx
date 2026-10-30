import { BrandLogo } from "@repo/design-system/components/brand-logo";
import { Icon } from "@repo/design-system/components/sal/icon";
import { localizedPath } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { localized, programmes } from "@repo/sal-data";
import NextLink from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CookieSettings } from "@/components/cookie-settings";
import { askedConsent } from "@/lib/consent";
import { readPublished } from "@/lib/supabase";

const INSTAGRAM = "https://www.instagram.com/auibsal";
const INSTAGRAM_HANDLE = "@auibsal";

interface FooterProps {
  /** The cookie settings link: only where the consent card runs (the site). */
  readonly consent?: boolean;
}

const linkClass = "hover:text-accent hover:underline hover:underline-offset-4";

/**
 * The one footer for the whole site, the members' pages and the Diwan
 * alike: ink in both modes. The reversed lockup in the page's language and
 * one sentence, three short columns under rose labels (Programs, Society,
 * Stay in touch), then a hairline and the fine print, which keeps the
 * policies and cookie settings within reach. Nothing here repeats the
 * header (owner, Oct 30, 2026): its sections, Search, Sign in and
 * Membership live only there.
 */
export const Footer = async ({ consent = true }: FooterProps = {}) => {
  const t = await getTranslations("web.footer");
  const tn = await getTranslations("web.nav");
  const tx = await getTranslations("web.footerExtra");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const email = t("columns.email");

  const programs = await readPublished(
    ["programmes"],
    async (c) => (await programmes.programmes(c)) ?? [],
    []
  );

  const columns = [
    {
      heading: t("columns.programs"),
      links: programs
        .filter(programmes.isListedProgram)
        .map(
          (p) => [`/events/${p.slug}`, localized(p, "name", locale)] as const
        ),
    },
    {
      heading: t("columns.society"),
      links: [
        ["/events/company", t("company")],
        ["/governance", t("governance")],
        ["/documents", tn("documents")],
        ["/partners", t("partners")],
        ["/give", tn("give")],
      ] as const,
    },
  ];

  const fine = [
    ["/privacy", t("privacy")],
    ["/documents/terms-of-use", t("terms")],
    ["/documents/accessibility", t("accessibility")],
    ["/qirtas/next-stop/care", t("sideQuestCare")],
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
        {columns
          .filter((column) => column.links.length > 0)
          .map((column) => (
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
              <Link className={linkClass} href="/newsletter">
                {t("newsletter")}
              </Link>
            </li>
            <li>
              <a
                className={`${linkClass} inline-flex items-center gap-1.5`}
                href={`mailto:${email}`}
              >
                <Icon name="mail" />
                <bdi dir="ltr">{email}</bdi>
              </a>
            </li>
            <li>
              <a
                className={linkClass}
                href={INSTAGRAM}
                rel="noopener"
                target="_blank"
              >
                {tx("instagram")} <bdi dir="ltr">{INSTAGRAM_HANDLE}</bdi>
                <Icon
                  className="ms-1.5 align-[-0.15em]"
                  label={tc("externalLink")}
                  name="arrow-up-right"
                />
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
