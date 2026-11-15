import { buttonVariants } from "@repo/brand/components/ui/button";
import type { Locale } from "@repo/internationalization";
import {
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ManageLinks } from "@/components/manage-links";
import {
  CallTerms,
  loadCalls,
  SendButtons,
  SubmitButton,
} from "@/components/qirtas/calls";
import { pieceHref } from "@/components/qirtas/cards";
import { EditionCover, loadEditions } from "@/components/qirtas/editions";
import { ShareLink } from "@/components/share";
import { journal, localized } from "@/lib/data";
import { mediaUrl } from "@/lib/media";
import { localizedMetadata } from "@/lib/metadata";
import { PLACEHOLDER_SLUG } from "@/lib/placeholder";
import { readPublished } from "@/lib/supabase";
import { roughlyNow } from "@/lib/this-year";

interface EditionProps {
  readonly params: Promise<{ locale: Locale; slug: string }>;
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/u;
type Edition = Awaited<ReturnType<typeof journal.issueBySlug>>;

// Pages are made on their first visit; the placeholder (never a real
// slug) lets the build check the route (Cache Components).
export const generateStaticParams = () => [{ slug: PLACEHOLDER_SLUG }];
// Made on its first visit, then kept until published again.
export const instant = false;

const load = (slug: string): Promise<Edition | null> =>
  SLUG.test(slug)
    ? readPublished(["journal"], (c) => journal.issueBySlug(c, slug), null)
    : Promise.resolve(null);

const loadEditionCalls = (slug: string) =>
  SLUG.test(slug) ? loadCalls(slug) : Promise.resolve([]);

/** The Edition's own words, from its call while it is not yet published. */
const fromCall = (call: journal.EditionCall) => ({
  theme_ar: call.edition_theme_ar,
  theme_en: call.edition_theme_en,
  title_ar: call.edition_title_ar,
  title_en: call.edition_title_en,
});

export const generateMetadata = async ({
  params,
}: EditionProps): Promise<Metadata> => {
  const { locale, slug } = await params;
  const edition = await load(slug);
  if (!edition) {
    const [call] = await loadEditionCalls(slug);
    return call
      ? localizedMetadata(locale, `/qirtas/editions/${slug}`, {
          description: localized(call, "theme", locale),
          title: localized(fromCall(call), "title", locale),
        })
      : {};
  }
  return localizedMetadata(locale, `/qirtas/editions/${edition.slug}`, {
    description: localized(edition, "theme", locale),
    image: mediaUrl(edition.cover_path) ?? undefined,
    title: localized(edition, "title", locale),
  });
};

/**
 * An Edition before it is published (decisions.md, Qirtas: "The Edition
 * page, one address for its whole life"): while its call is open, the
 * title, one line and "Submit to <Edition>", then the poster's words, the
 * terms and dates, and the form buttons; once it closes, "Reading now,
 * published <date>".
 */
const CallView = async ({
  calls,
  locale,
  now,
  slug,
}: {
  readonly calls: readonly journal.EditionCall[];
  readonly locale: Locale;
  readonly now: Date;
  readonly slug: string;
}) => {
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const tc = await getTranslations({
    locale,
    namespace: "web.journal.callPage",
  });
  const [first] = calls;
  if (!first) {
    notFound();
  }
  const title = localized(fromCall(first), "title", locale);
  const open = calls.filter((call) => journal.isOpenAt(call, now));
  const haven = slug === "haven";
  const th = await getTranslations({ locale, namespace: "web.journal.haven" });
  const tw = await getTranslations({
    locale,
    namespace: "diwan.journal.write.haven",
  });
  const line = haven
    ? th("dek")
    : localized(fromCall(first), "theme", locale) || t("edition");
  let reading: string | null = null;
  if (open.length === 0) {
    reading = first.edition_publish_at
      ? tc("readingNow", {
          date: formatLongDate(first.edition_publish_at, locale, true),
        })
      : tc("readingNowUndated");
  }
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10">
      <header className="grid gap-3">
        <h1 className="type-display">{title}</h1>
        <p className="type-lede max-w-3xl">{line}</p>
        {open.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
            <SubmitButton label={tc("submitTo", { edition: title })} />
          </div>
        ) : null}
        <ManageLinks diwan={`/qirtas/editions/${slug}`} />
      </header>
      {reading ? <p className="type-body max-w-3xl">{reading}</p> : null}
      {haven && open.length > 0 ? (
        <div className="grid max-w-[60ch] gap-4">
          <p className="reading">{tw("memories")}</p>
          <p className="type-lede">{tw("call")}</p>
        </div>
      ) : null}
      {open.map((call) => (
        <section
          aria-labelledby={`call-${call.id}`}
          className="grid gap-6"
          key={call.id}
        >
          <h2 className="type-title" id={`call-${call.id}`}>
            {localized(call, "title", locale)}
          </h2>
          <CallTerms call={call} locale={locale} />
        </section>
      ))}
      {open.length > 0 ? (
        <section aria-labelledby="send-title" className="grid gap-4" id="send">
          <h2 className="type-title" id="send-title">
            {tc("chooseForm")}
          </h2>
          {open.map((call) => (
            <div className="grid gap-3" key={call.id}>
              {open.length > 1 ? (
                <p className="type-label">{localized(call, "title", locale)}</p>
              ) : null}
              <SendButtons call={call} locale={locale} />
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
};

/**
 * An Edition as a book (design review C12): the cover (the scan, or the
 * typographic cover), its print line, the editor's letter, a contents page
 * by section, and the Editions before and after it. Before it is
 * published, its call (CallView).
 */
const EditionPage = async ({ params }: EditionProps) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const edition = await load(slug);
  if (!edition) {
    const [calls, now] = await Promise.all([
      loadEditionCalls(slug),
      roughlyNow(),
    ]);
    if (calls.length === 0) {
      notFound();
    }
    return (
      <CallView calls={calls} locale={locale} now={new Date(now)} slug={slug} />
    );
  }
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const pieces = journal.inLanguage(
    await readPublished(
      ["journal"],
      (c) => journal.editionPieces(c, edition.id),
      []
    ),
    locale
  );
  const shelf = await loadEditions();
  const at = shelf.findIndex((e) => e.id === edition.id);
  const older = at >= 0 ? shelf[at + 1] : undefined;
  const newer = at > 0 ? shelf[at - 1] : undefined;
  const pdf = mediaUrl(edition.pdf_path);
  const letter = localized(edition, "editors_note", locale);
  // The printed edition (decisions.md), once its record is complete.
  const printer = localized(edition, "printer", locale);
  const printed =
    printer && edition.printed_on && edition.print_run
      ? t("printed", {
          copies: formatNumber(edition.print_run, locale),
          date: formatLongDate(edition.printed_on, locale),
          printer,
        })
      : null;
  const byDesk = journal.desks
    .map((desk) => ({ desk, pieces: pieces.filter((p) => p.desk === desk) }))
    .filter((group) => group.pieces.length > 0);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-10">
      <header className="grid gap-8 md:grid-cols-[1fr_2fr]">
        <div className="w-full max-w-sm">
          <EditionCover edition={edition} locale={locale} />
        </div>
        <div className="grid content-start gap-3">
          <h1 className="type-display">
            {localized(edition, "title", locale)}
          </h1>
          <p className="type-caption">
            {localized(edition, "season", locale) || t("edition")}
          </p>
          <ManageLinks diwan={`/qirtas/editions/${edition.slug}`} />
          <ShareLink title={localized(edition, "title", locale)} />
          {localized(edition, "theme", locale) ? (
            <p className="type-lede">{localized(edition, "theme", locale)}</p>
          ) : null}
          {printed ? <p className="type-caption">{printed}</p> : null}
          {pdf ? (
            <a
              className={buttonVariants({
                className: "justify-self-start",
                variant: "outline",
              })}
              href={pdf}
            >
              {t("pdf")}
            </a>
          ) : null}
        </div>
      </header>
      {letter ? (
        <section
          aria-labelledby="letter"
          className="reading mx-auto grid w-full max-w-2xl gap-3 p-8"
        >
          <h2 className="type-heading" id="letter">
            {t("editorsNote")}
          </h2>
          <p className="whitespace-pre-wrap">{letter}</p>
        </section>
      ) : null}
      <section
        aria-labelledby="contents"
        className="mx-auto grid w-full max-w-3xl gap-10"
      >
        <h2 className="type-heading" id="contents">
          {t("contents")}
        </h2>
        {byDesk.map((group) => (
          <div className="grid gap-3" key={group.desk}>
            <h3 className="type-label">{t(`desks.${group.desk}`)}</h3>
            <ol className="border-line grid border-b">
              {group.pieces.map((piece) => (
                <li className="border-line border-t" key={piece.id}>
                  <Link
                    className="group grid gap-x-6 gap-y-1 py-3 sm:grid-cols-[1fr_auto] sm:items-baseline"
                    href={pieceHref(piece)}
                  >
                    <span className="type-subheading group-hover:text-accent">
                      {localized(piece, "title", locale)}
                    </span>
                    {piece.contributor ? (
                      <span className="type-caption text-text-secondary">
                        {localized(piece.contributor, "name", locale)}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </section>
      {older || newer ? (
        <nav
          aria-label={t("otherEditions")}
          className="border-text mx-auto grid w-full max-w-3xl gap-4 border-t pt-6 sm:grid-cols-2"
        >
          {older ? (
            <Link
              className="group grid gap-1"
              href={`/qirtas/editions/${older.slug}`}
            >
              <span className="type-caption">{t("previousEdition")}</span>
              <span className="type-title group-hover:text-accent">
                {localized(older, "title", locale)}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {newer ? (
            <Link
              className="group grid gap-1 sm:text-end"
              href={`/qirtas/editions/${newer.slug}`}
            >
              <span className="type-caption">{t("nextEdition")}</span>
              <span className="type-title group-hover:text-accent">
                {localized(newer, "title", locale)}
              </span>
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
};

export default EditionPage;
