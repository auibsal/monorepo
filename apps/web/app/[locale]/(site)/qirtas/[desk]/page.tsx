import { Button } from "@repo/brand/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { localizedPath } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PieceCardView } from "@/components/qirtas/cards";
import { SelectionBar } from "@/components/qirtas/gallery-selection";
import { journal, localized } from "@/lib/data";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

interface DeskProps {
  readonly params: Promise<{ desk: string; locale: Locale }>;
}

// Games has a page of its own (/qirtas/games), with the daily games.
const isDesk = (value: string): value is journal.Desk =>
  value !== "games" && (journal.desks as readonly string[]).includes(value);

export const generateStaticParams = () =>
  journal.desks.filter((desk) => desk !== "games").map((desk) => ({ desk }));

export const generateMetadata = async ({
  params,
}: DeskProps): Promise<Metadata> => {
  const { desk, locale } = await params;
  if (!isDesk(desk)) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "web.journal" });
  return localizedMetadata(locale, `/qirtas/${desk}`, {
    description: t(`deskLedes.${desk}`),
    feed: `/qirtas/${desk}/feed.xml`,
    title: `${t(`desks.${desk}`)} · ${t("title")}`,
  });
};

/**
 * The section's editor, from the masthead (decisions.md, Qirtas): the
 * person holding <desk>_editor, or who covers the seat while it is open.
 */
const deskEditor = async (desk: journal.Desk, locale: Locale) => {
  const people = await readPublished(
    ["journal"],
    (c) => journal.masthead(c),
    []
  );
  const seat = people.find((p) => p.role === `${desk}_editor`);
  if (!seat) {
    return null;
  }
  if (seat.full_name_en) {
    return {
      covered: null,
      name: localized(
        {
          full_name_ar: seat.full_name_ar ?? "",
          full_name_en: seat.full_name_en,
        },
        "full_name",
        locale
      ),
    };
  }
  return { covered: seat.covered_by, name: null };
};

/**
 * A section of the paper: News, Voices, Letters, Gallery or Video. Every
 * section front follows one pattern (decisions.md, Qirtas): its title, one
 * sentence, its call as the action, its editor from the masthead, then the
 * list.
 */
const DeskPage = async ({ params }: DeskProps) => {
  const { desk, locale } = await params;
  setRequestLocale(locale);
  if (!isDesk(desk)) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const pieces = journal.inLanguage(
    await readPublished(
      ["journal"],
      (c) => journal.deskPieces(c, desk, { limit: 48 }),
      []
    ),
    locale
  );
  const pictures = desk === "gallery" || desk === "video";
  const editor = await deskEditor(desk, locale);
  const takesWork = journal.sendableCategories(desk).length > 0;
  let editorLine: string | null = null;
  if (editor?.name) {
    editorLine = t("deskEditor", { name: editor.name });
  } else if (editor?.covered) {
    editorLine =
      editor.covered === "managing_editor"
        ? t("masthead.checkedByManagingEditor")
        : t("masthead.coveredByEditorInChief");
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10">
      <header className="grid gap-3">
        <h1 className="type-display">{t(`desks.${desk}`)}</h1>
        <p className="type-lede max-w-3xl">{t(`deskLedes.${desk}`)}</p>
        {takesWork ? (
          <Button asChild className="justify-self-start">
            <Link href={`/qirtas/submit#${desk}`} prefetch={false}>
              {t("sendTo", { desk: t(`desks.${desk}`) })}
            </Link>
          </Button>
        ) : null}
        {editorLine ? <p className="type-caption">{editorLine}</p> : null}
        <p className="type-caption flex flex-wrap gap-x-5">
          <Link className="link" href="/qirtas/archive">
            {t("archive.open")}
          </Link>
          <a
            className="link"
            href={localizedPath(locale, `/qirtas/${desk}/feed.xml`)}
          >
            {t("feed")}
          </a>
        </p>
        {desk === "gallery" ? <SelectionBar /> : null}
      </header>
      {pieces.length === 0 ? (
        <p className="type-body text-text-secondary">{t("noPieces")}</p>
      ) : (
        <ul
          className={
            desk === "letters"
              ? "reading grid gap-10 p-6 sm:grid-cols-2"
              : "grid gap-10 sm:grid-cols-2 lg:grid-cols-3"
          }
        >
          {pieces.map((piece) => (
            <li key={piece.id}>
              <PieceCardView
                heading="h2"
                image={pictures || desk === "news"}
                locale={locale}
                piece={piece}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DeskPage;
