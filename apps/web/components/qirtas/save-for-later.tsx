"use client";

import { type Locale, localizedPath } from "@repo/internationalization";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { hasSessionCookie } from "@/lib/auth/session-cookie";

type State = "hidden" | "saved" | "unsaved";

/**
 * The signed-in client, loaded only for someone signed in: visitors (and
 * the pages that prefetch a piece) never download it.
 */
const savedPieces = async () =>
  (await import("@/lib/diwan/supabase"))
    .getSupabase()
    .schema("journal")
    .from("saved_pieces");

/**
 * Save a piece to read later (the design review A9, Nov 4, 2026). Shown
 * only to someone signed in, after the first render, so the page stays
 * the same for everyone and is cached; the database decides who may save
 * (a published piece they can read, into their own list). The list is on
 * Today and at /account/work.
 */
export const SaveForLater = ({ pieceId }: { readonly pieceId: string }) => {
  const t = useTranslations("web.journal.saved");
  const locale = useLocale() as Locale;
  const [state, setState] = useState<State>("hidden");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!hasSessionCookie(document.cookie)) {
      return;
    }
    let live = true;
    savedPieces()
      .then((table) =>
        table.select("piece_id").eq("piece_id", pieceId).maybeSingle()
      )
      .then(({ data, error }) => {
        if (live && !error) {
          setState(data ? "saved" : "unsaved");
        }
      });
    return () => {
      live = false;
    };
  }, [pieceId]);

  if (state === "hidden") {
    return null;
  }

  const toggle = async () => {
    setBusy(true);
    setFailed(false);
    const table = await savedPieces();
    const { error } =
      state === "saved"
        ? await table.delete().eq("piece_id", pieceId)
        : await table.insert({ piece_id: pieceId });
    setBusy(false);
    if (error) {
      setFailed(true);
      return;
    }
    setState(state === "saved" ? "unsaved" : "saved");
  };

  return (
    <p className="type-caption flex flex-wrap items-baseline gap-x-4 gap-y-1 print:hidden">
      <button
        aria-pressed={state === "saved"}
        className="link"
        disabled={busy}
        onClick={toggle}
        type="button"
      >
        {state === "saved" ? t("unsave") : t("save")}
      </button>
      {state === "saved" ? (
        <a className="link" href={localizedPath(locale, "/account/work")}>
          {t("list")}
        </a>
      ) : null}
      {failed ? <span role="alert">{t("failed")}</span> : null}
    </p>
  );
};
