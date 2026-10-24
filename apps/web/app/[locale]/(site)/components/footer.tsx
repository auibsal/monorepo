import { project } from "@repo/config";
import { localizedPath, nexusPath } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CookieSettings } from "@/components/cookie-settings";
import { askedConsent } from "@/lib/consent";
import { MUTANABBI } from "@/lib/verse";

const INSTAGRAM = "https://www.instagram.com/auibsal";

/** v5 footer: the ink ground, the rest of the sections and the small print. */
export const Footer = async () => {
  const t = await getTranslations("web.footer");
  const tc = await getTranslations("common");
  const tn = await getTranslations("web.nav");
  const tx = await getTranslations("web.footerExtra");
  const locale = await getLocale();

  const groups = [
    [
      ["/give", tn("give")],
      ["/waraq/news", tn("news")],
      ["/newsletter", t("newsletter")],
      ["/documents", tn("documents")],
      ["/governance", t("governance")],
      ["/partners", t("partners")],
      ["/programs/productions", t("productions")],
      ["/search", t("search")],
    ],
    [
      ["/contact", t("contact")],
      ["/media-kit", t("mediaKit")],
      ["/privacy", t("privacy")],
      ["/documents/terms-of-use", t("terms")],
      ["/documents/accessibility", t("accessibility")],
      ["/programs/side-quest/care", t("sideQuestCare")],
    ],
  ] as const;

  return (
    <footer className="frame-t bg-surface text-text" data-theme="dark">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid content-start gap-2 lg:col-span-2">
          <p className="font-bold text-lg">{tc("society")}</p>
          <p className="type-caption">{tx("recognition")}</p>
          {/* A small find: the motto opens to the whole line it comes from. */}
          <details className="type-caption">
            <summary className="cursor-pointer" lang="ar">
              {project.motto.ar}
            </summary>
            <p className="pt-2" dir="rtl" lang="ar">
              {MUTANABBI}
            </p>
          </details>
          <a
            className="type-label mt-4 justify-self-start border-2 border-frame px-4 py-2 text-xs shadow-offset"
            href={localizedPath(locale, nexusPath())}
          >
            {tn("nexus")}
          </a>
        </div>
        {groups.map((links) => (
          <ul className="grid content-start gap-2 text-sm" key={links[0][0]}>
            {links.map(([href, label]) => (
              <li key={href}>
                <Link
                  className="underline-offset-4 hover:underline"
                  href={href}
                >
                  {label}
                </Link>
              </li>
            ))}
            {links[0][0] === "/contact" ? (
              <li>
                <a
                  className="underline-offset-4 hover:underline"
                  href={INSTAGRAM}
                  rel="noopener"
                  target="_blank"
                >
                  {tx("instagram")}
                </a>
              </li>
            ) : null}
            {links[0][0] === "/contact" &&
            Object.values(askedConsent()).some(Boolean) ? (
              <CookieSettings />
            ) : null}
          </ul>
        ))}
      </div>
      <div className="frame-t">
        <div className="type-caption mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-2 px-4 py-6">
          <p>{tx("copyright", { year: String(new Date().getFullYear()) })}</p>
          <p>{tx("colophon")}</p>
        </div>
      </div>
    </footer>
  );
};
