"use client";

import { Button } from "@repo/brand/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatClock } from "@repo/internationalization/format";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/provider";

/** How long typing rests before the draft is kept. */
const PAUSE_MS = 1500;

interface Offer<T> {
  readonly at: string;
  readonly data: T;
}

/**
 * Autosave (decisions.md, The site): what someone types is kept in their
 * own draft (api.drafts, by person and record) as they type; nothing goes
 * live until Save or Send. Reopened, the page offers "Restore your
 * changes from 2:14 p.m." or Discard; leaving warns only while a change
 * isn't kept yet. `clear` runs on Save and Send.
 */
export const useAutosave = <T,>({
  initial,
  recordKey,
  value,
}: {
  /** The record as it is saved: no draft is kept while nothing differs. */
  readonly initial: T;
  readonly recordKey: string;
  readonly value: T;
}) => {
  const { supabase, user } = useAuth();
  const [offer, setOffer] = useState<Offer<T> | null>(null);
  const [asked, setAsked] = useState(false);
  const [unsynced, setUnsynced] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const changed = JSON.stringify(value) !== JSON.stringify(initial);
  const drafts = useCallback(
    () => supabase.schema("api").from("drafts"),
    [supabase]
  );

  // Reopened: a draft kept earlier is offered, never applied unasked.
  useEffect(() => {
    if (!user) {
      return;
    }
    let live = true;
    drafts()
      .select("data, updated_at")
      .eq("record_key", recordKey)
      .maybeSingle()
      .then(({ data }) => {
        if (live) {
          setOffer(data ? { at: data.updated_at, data: data.data as T } : null);
          setAsked(true);
        }
      });
    return () => {
      live = false;
    };
  }, [drafts, recordKey, user]);

  // Typing: kept once it rests, and only once the offer is answered.
  useEffect(() => {
    if (!(asked && user) || offer || !changed) {
      return;
    }
    setUnsynced(true);
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(async () => {
      const { error } = await drafts().upsert(
        { data: value as never, record_key: recordKey, user_id: user.id },
        { onConflict: "user_id,record_key" }
      );
      if (!error) {
        setUnsynced(false);
      }
    }, PAUSE_MS);
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [asked, changed, drafts, offer, recordKey, user, value]);

  // Leaving warns only while a change isn't kept.
  useEffect(() => {
    if (!unsynced) {
      return;
    }
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsynced]);

  const clear = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    setUnsynced(false);
    setOffer(null);
    await drafts().delete().eq("record_key", recordKey);
  }, [drafts, recordKey]);

  return {
    clear,
    /** Throws the kept draft away. */
    discard: clear,
    offer,
    /** Takes the kept draft; the page applies `offer.data`. */
    restored: () => setOffer(null),
  };
};

/** "Restore your changes from 2:14 p.m." with Restore and Discard. */
export const DraftOffer = <T,>({
  autosave,
  onRestore,
}: {
  readonly autosave: ReturnType<typeof useAutosave<T>>;
  readonly onRestore: (data: T) => void;
}) => {
  const t = useTranslations("common.autosave");
  const locale = useLocale() as Locale;
  const { offer } = autosave;
  if (!offer) {
    return null;
  }
  return (
    <div
      className="border-line flex flex-wrap items-center gap-x-4 gap-y-2 border-y py-3"
      role="status"
    >
      <Button
        onClick={() => {
          onRestore(offer.data);
          autosave.restored();
        }}
        size="sm"
        type="button"
        variant="outline"
      >
        {t("restore", { time: formatClock(offer.at, locale) })}
      </Button>
      <button
        className="link text-sm"
        onClick={() => autosave.discard()}
        type="button"
      >
        {t("discard")}
      </button>
    </div>
  );
};
