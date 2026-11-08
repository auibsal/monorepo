"use client";

import { Icon } from "@repo/brand/components/sal/icon";
import { Input } from "@repo/brand/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useDeferredValue, useEffect, useId, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { content, localized } from "@/lib/data";
import { Link, usePathname } from "@/lib/diwan/navigation";
import { adminSections } from "@/lib/rbac";
import { useVisibleModules } from "./admin-shell";
import { allowedViews } from "./section-views";

/** Where a published record is kept in the Diwan, and the module that opens it. */
const RECORDS = {
  event: { module: "events", path: (slug: string) => `/events/${slug}` },
  piece: {
    module: "journal",
    path: (slug: string) => `/qirtas/pieces/${slug}`,
  },
  production: {
    module: "productions",
    path: (slug: string) => `/company/${slug}`,
  },
} as const;

type RecordKind = keyof typeof RECORDS;

const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/**
 * Find anything in the Diwan (design review A38; decisions.md: it
 * pushes the page down and is never a dialog). Opened with "/" or Ctrl+K
 * (⌘K), or its own link under the row; Escape closes it. It lists the
 * Diwan's views the officer's roles open, then records from the Society's
 * own search (published events, pieces and productions), each only when
 * the officer's modules include it; the record's page still checks.
 */
export const FindPanel = () => {
  const t = useTranslations("diwan.admin.find");
  const ts = useTranslations("diwan.admin.sections");
  const locale = useLocale();
  const id = useId();
  const pathname = usePathname();
  const { supabase } = useAuth();
  const { grants, visible } = useVisibleModules();
  const [open, setOpen] = useState(false);
  const [words, setWords] = useState("");
  const query = useDeferredValue(words.trim());
  const input = useRef<HTMLInputElement>(null);
  const modules = new Set<string>(visible.map((m) => m.key));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const k = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && k === "k") {
        event.preventDefault();
        setOpen(true);
      } else if (k === "/" && !typing(event.target)) {
        event.preventDefault();
        setOpen(true);
      } else if (k === "escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      input.current?.focus();
    }
  }, [open]);

  // A new page closes the panel.
  // biome-ignore lint/correctness/useExhaustiveDependencies: closes on navigation only
  useEffect(() => {
    setOpen(false);
    setWords("");
  }, [pathname]);

  const records = useQuery({
    enabled: open && query.length >= 2,
    queryFn: () => content.search(supabase, query, 20),
    queryKey: ["diwan-find", query],
  });

  if (modules.size === 0) {
    return null;
  }

  const lower = query.toLocaleLowerCase(locale);
  const views = adminSections
    .flatMap((section) =>
      allowedViews(section.key, modules, grants.data).map((view) => ({
        href: view.href,
        label:
          view.key === "desk" || view.key === "company"
            ? ts(view.key)
            : `${ts(section.key)} · ${ts(`tabs.${view.key}`)}`,
      }))
    )
    .filter(
      (v) =>
        lower.length > 0 && v.label.toLocaleLowerCase(locale).includes(lower)
    );
  const found = (records.data ?? []).flatMap((row) => {
    const kind = row.kind as RecordKind;
    const where = RECORDS[kind];
    return where && modules.has(where.module) && row.slug
      ? [
          {
            href: where.path(row.slug),
            key: `${kind}-${row.id}`,
            kind,
            title: localized(row, "title", locale),
          },
        ]
      : [];
  });

  return (
    <div className="border-line border-b print:hidden">
      <div className="mx-auto w-full max-w-6xl px-4">
        {open ? (
          <search className="grid gap-4 py-4">
            <div className="flex items-center gap-3">
              <label className="sr-only" htmlFor={id}>
                {t("label")}
              </label>
              <Icon className="size-4 shrink-0" name="search" />
              <Input
                autoComplete="off"
                id={id}
                onChange={(e) => setWords(e.target.value)}
                placeholder={t("placeholder")}
                ref={input}
                type="search"
                value={words}
              />
              <button
                className="type-caption shrink-0 underline underline-offset-4"
                onClick={() => setOpen(false)}
                type="button"
              >
                {t("close")}
              </button>
            </div>
            {query.length > 0 ? (
              <div aria-live="polite" className="grid gap-4">
                {views.length > 0 ? (
                  <ul aria-label={t("views")} className="grid">
                    {views.map((v) => (
                      <li className="border-line border-t" key={v.href}>
                        <Link
                          className="hover:text-accent block py-2"
                          href={v.href}
                        >
                          {v.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {found.length > 0 ? (
                  <ul aria-label={t("records")} className="grid">
                    {found.map((r) => (
                      <li className="border-line border-t" key={r.key}>
                        <Link
                          className="hover:text-accent flex items-baseline justify-between gap-4 py-2"
                          href={r.href}
                        >
                          <span>{r.title}</span>
                          <span className="type-caption">
                            {t(`kinds.${r.kind}`)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {views.length === 0 &&
                found.length === 0 &&
                (query.length < 2 || !records.isPending) ? (
                  <p className="type-caption">{t("nothing")}</p>
                ) : null}
              </div>
            ) : (
              <p className="type-caption">{t("hint")}</p>
            )}
          </search>
        ) : (
          <button
            className="type-caption text-text-secondary hover:text-text flex items-center gap-2 py-2"
            onClick={() => setOpen(true)}
            type="button"
          >
            <Icon className="size-4" name="search" />
            {t("open")}
          </button>
        )}
      </div>
    </div>
  );
};
