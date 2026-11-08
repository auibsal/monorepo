"use client";

import { Link } from "@repo/internationalization/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const KEY = "sal_gallery_selection";
const CHANGED = "sal-gallery-selection";
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** As `journal.SELECTION_MAX`, kept here so the toggle stays small. */
const MAX = 12;

const read = (): string[] => {
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value)
      ? value
          .filter((s): s is string => typeof s === "string" && SLUG.test(s))
          .slice(0, MAX)
      : [];
  } catch {
    return [];
  }
};

const write = (slugs: string[]) => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(slugs));
  } catch {
    // Private windows may refuse storage; the change still shows here.
  }
  window.dispatchEvent(new CustomEvent(CHANGED, { detail: slugs }));
};

/** A selection's address: the pieces themselves, in order (A10). */
const selectionPath = (slugs: readonly string[]) =>
  `/qirtas/selection/${slugs.join("/")}`;

/** The selection being made, kept in this browser until it is shared. */
const useSelection = () => {
  const [slugs, setSlugs] = useState<string[] | null>(null);
  useEffect(() => {
    setSlugs(read());
    const changed = (event: Event) =>
      setSlugs((event as CustomEvent<string[]>).detail);
    window.addEventListener(CHANGED, changed);
    return () => window.removeEventListener(CHANGED, changed);
  }, []);
  return slugs;
};

/**
 * Add a Gallery piece to a selection to share (design review A10). Nothing
 * is sent or stored by the Society: the selection is its address, kept in
 * this browser until it is shared. Shown after the first render, so the
 * cached page is the same for everyone.
 */
export const SelectionToggle = ({ slug }: { readonly slug: string }) => {
  const t = useTranslations("web.journal.selection");
  const slugs = useSelection();
  if (!slugs) {
    return null;
  }
  const chosen = slugs.includes(slug);
  const full = !chosen && slugs.length >= MAX;
  return (
    <p className="type-caption flex flex-wrap items-baseline gap-x-4 gap-y-1 print:hidden">
      <button
        aria-pressed={chosen}
        className="link"
        disabled={full}
        onClick={() =>
          write(chosen ? slugs.filter((s) => s !== slug) : [...slugs, slug])
        }
        type="button"
      >
        {chosen ? t("remove") : t("add")}
      </button>
      {slugs.length > 0 ? (
        <Link className="link" href={selectionPath(slugs)}>
          {t("yours", {
            count: slugs.length,
            pieces: String(slugs.length),
          })}
        </Link>
      ) : null}
      {full ? <span>{t("full")}</span> : null}
    </p>
  );
};

/** On the Gallery's page: the selection being made, to see and share. */
export const SelectionBar = () => {
  const t = useTranslations("web.journal.selection");
  const slugs = useSelection();
  if (!slugs || slugs.length === 0) {
    return <p className="type-caption text-text-secondary">{t("howTo")}</p>;
  }
  return (
    <p className="type-caption flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <Link className="link" href={selectionPath(slugs)}>
        {t("yours", { count: slugs.length, pieces: String(slugs.length) })}
      </Link>
      <button className="link" onClick={() => write([])} type="button">
        {t("clear")}
      </button>
    </p>
  );
};
