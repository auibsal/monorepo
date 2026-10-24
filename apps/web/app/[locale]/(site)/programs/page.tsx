import { Link } from "@repo/internationalization/navigation";
import { localized, programmes } from "@repo/sal-data";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, Section } from "@/components/section";
import { type LocaleParams, sectionMetadata } from "@/lib/page";
import { readPublished } from "@/lib/supabase";

export const generateMetadata = sectionMetadata("web.programmes", "/programs");

const ProgrammesPage = async ({ params }: LocaleParams) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.programmes" });
  const all: Awaited<ReturnType<typeof programmes.programmes>> =
    await readPublished(["programmes"], (c) => programmes.programmes(c), []);
  const rows = (all ?? []).filter((p) => p.is_active);
  const group = (name: programmes.ProgrammeGroup) =>
    rows.filter((p) => programmes.programmeGroup(p) === name);

  // Flagship names in Light Italic accent (v6); the rest in Regular ink.
  const item = (p: (typeof rows)[number]) => {
    const flagship = programmes.programmeGroup(p) === "flagship";
    return (
      <li
        className="grid content-start gap-2 border-line border-t py-space-4"
        key={p.id}
      >
        <h3
          className={
            flagship ? "type-title type-accent font-light!" : "type-heading"
          }
        >
          {localized(p, "name", locale)}
        </h3>
        {localized(p, "summary", locale) ? (
          <p className="type-body max-w-[44ch] text-text-secondary">
            {localized(p, "summary", locale)}
          </p>
        ) : null}
        {p.slug === "waraq" ? (
          <Link className="link type-caption justify-self-start" href="/qirtas">
            {t("journal")}
          </Link>
        ) : null}
        {p.slug === "company" ? (
          <Link
            className="link type-caption justify-self-start"
            href="/programs/productions"
          >
            {t("productions")}
          </Link>
        ) : null}
        {p.slug === "side-quest" ? (
          <Link
            className="link type-caption justify-self-start"
            href="/programs/side-quest/care"
          >
            {t("care")}
          </Link>
        ) : null}
      </li>
    );
  };

  const weekly = group("weekly");
  const specials = group("special");

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-20 px-4 py-16 sm:py-24">
      <PageHeader lede={t("lede")} title={t("title")} />
      <Section id="flagship" title={t("major")}>
        <ul className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
          {group("flagship").map(item)}
        </ul>
      </Section>
      {weekly.length > 0 ? (
        <Section id="weekly" title={t("weekly")}>
          <p className="type-body -mt-space-3 text-text-secondary">
            {t("weeklyNote")}
          </p>
          <ul className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-4">
            {weekly.map(item)}
          </ul>
        </Section>
      ) : null}
      {specials.length > 0 ? (
        <Section id="specials" title={t("specials")}>
          <ul className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
            {specials.map(item)}
          </ul>
        </Section>
      ) : null}
      <p className="border-line border-t pt-space-4">
        <Link className="link" href="/events">
          {t("events")}
        </Link>
      </p>
    </div>
  );
};

export default ProgrammesPage;
