import { BrandLogo } from "@repo/brand/components/brand-logo";
import { Icon } from "@repo/brand/components/sal/icon";
import { project } from "@repo/config";
import { localizedPath } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import NextLink from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { NewsletterSignup } from "@/components/newsletter/signup";
import { thisYear } from "@/lib/this-year";
import { version as VERSION } from "../package.json";

const linkClass = "hover:text-accent hover:underline hover:underline-offset-4";

/** The year the Society's site opened: the copyright runs from it. */
const FIRST_YEAR = 2026;

/** "2026", then "2026–2027" from 2027 (decisions.md, The site). */
const years = (year: number) =>
  year > FIRST_YEAR ? `${FIRST_YEAR}–${year}` : String(FIRST_YEAR);

/**
 * The public footer (decisions.md, The site: the frame every page shares),
 * ink in both modes: the reversed lockup and one sentence, then four short
 * columns (The Society; Take part; Read and watch; Policies), then the
 * social links, "Raise a concern", the postal address, the paperless line
 * and the copyright. `qirtas` adds that each piece belongs to its writer.
 */
export const Footer = async ({
  qirtas = false,
}: {
  readonly qirtas?: boolean;
} = {}) => {
  const year = await thisYear();
  const t = await getTranslations("web.footer");
  const tc = await getTranslations("common");
  const locale = await getLocale();

  const columns = [
    {
      heading: t("columns.society"),
      links: [
        ["/about", t("about")],
        ["/about/council", t("council")],
        ["/about/press", t("press")],
        ["/partners", t("partners")],
        ["/about/contact", t("contact")],
      ],
    },
    {
      heading: t("columns.takePart"),
      links: [
        ["/join", t("join")],
        ["/get-involved", t("involved")],
        ["/events", t("events")],
        ["/qirtas/submit", t("write")],
      ],
    },
    {
      heading: t("columns.read"),
      links: [
        ["/qirtas", t("qirtas")],
        ["/qirtas/editions", t("editions")],
        ["/next-stop", t("nextStop")],
        ["/company", t("company")],
      ],
    },
    {
      heading: t("columns.policies"),
      links: [
        ["/privacy", t("privacy")],
        ["/terms", t("terms")],
        ["/accessibility", t("accessibility")],
        ["/code-of-conduct", t("conduct")],
        ["/security", t("security")],
      ],
    },
  ] as const;

  return (
    <footer className="bg-footer text-text print:hidden" data-theme="dark">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-10 px-4 pt-14 pb-10 text-[0.90625rem] sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] lg:gap-8">
        <div className="col-span-2 grid content-start gap-4 lg:col-span-1">
          <NextLink
            className="justify-self-start"
            href={localizedPath(locale, "/")}
          >
            <BrandLogo className="h-14" height={56} locale={locale} />
          </NextLink>
          <p className="text-text-secondary max-w-[34ch]">{t("recognition")}</p>
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
            {/* The Sunday Paper's sign-up closes Read and watch (fourth
                prompt, 7l). */}
            {column.heading === t("columns.read") ? (
              <div className="grid gap-2 pt-2">
                <Link className={linkClass} href="/sunday-paper">
                  {t("sundayPaper")}
                </Link>
                <NewsletterSignup compact inFooter />
              </div>
            ) : null}
          </div>
        ))}
        <div className="border-line text-text-secondary col-span-2 grid gap-3 border-t pt-5 text-[0.8125rem] lg:col-span-5">
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {project.channels.map((channel) => (
              <li key={channel.kind}>
                <a
                  className={linkClass}
                  href={channel.url}
                  rel="noopener"
                  target="_blank"
                >
                  {t(`social.${channel.kind}`)}
                  <Icon
                    className="ms-1.5 align-[-0.15em]"
                    label={tc("externalLink")}
                    name="arrow-up-right"
                  />
                </a>
              </li>
            ))}
            <li>
              <Link className={linkClass} href="/about/contact/concern">
                {t("concern")}
              </Link>
            </li>
          </ul>
          <p>{t("address")}</p>
          <p>{t("paperless")}</p>
          {qirtas ? <p>{t("pieces")}</p> : null}
          <p>{t("copyright", { years: years(year) })}</p>
        </div>
      </div>
    </footer>
  );
};

/**
 * The slim footer of the private spaces (your account, the partner
 * dashboard, the Diwan): Help, Privacy, Terms and Report a problem; the
 * Diwan's also shows the site's version and build.
 */
export const SlimFooter = async ({
  build = false,
}: {
  readonly build?: boolean;
} = {}) => {
  const t = await getTranslations("web.footer");
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
  const links = [
    ["/help", t("help")],
    ["/privacy", t("privacy")],
    ["/terms", t("terms")],
    ["/help/report", t("report")],
  ] as const;
  return (
    <footer className="border-line text-text-secondary mt-auto border-t print:hidden">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-4 py-4 text-[0.8125rem] sm:px-6">
        <ul className="flex flex-wrap gap-x-5 gap-y-1">
          {links.map(([href, label]) => (
            <li key={href}>
              <Link className={linkClass} href={href}>
                {label}
              </Link>
            </li>
          ))}
        </ul>
        {build ? (
          <p>{t("version", { build: sha ?? t("local"), version: VERSION })}</p>
        ) : null}
      </div>
    </footer>
  );
};
