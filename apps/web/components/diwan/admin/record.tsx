"use client";

import { Button } from "@repo/brand/components/ui/button";
import { cn } from "@repo/brand/lib/utils";
import { useTranslations } from "next-intl";
import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryState } from "@/lib/diwan/use-query-param";
import { DiwanSection } from "../page";
import { SectionFormContext } from "./section-form";

// One record page (decisions.md, The site: "One record page"): the header
// (title, status, one main action, a menu for the rest), section tabs with
// Overview first and History last, and sections that read as text, each
// with its own Edit opening its one form over a sticky Cancel / Save bar.

export interface RecordTab {
  readonly content: ReactNode;
  /** In the address as ?tab=<id>; Overview's is "overview". */
  readonly id: string;
  readonly label: string;
}

const STEP = { ArrowLeft: -1, ArrowRight: 1 } as const;

/**
 * The record's tabs. Overview comes first and History last, whatever order
 * the page passes them in; the open tab is kept in the address (?tab=).
 * Tabs the record doesn't use are left out by the page.
 */
export const RecordTabs = ({
  label,
  tabs,
}: {
  readonly label: string;
  readonly tabs: readonly RecordTab[];
}) => {
  const id = useId();
  const [kept, keep] = useQueryState("tab");
  const ordered = useMemo(
    () => [
      ...tabs.filter((tab) => tab.id === "overview"),
      ...tabs.filter((tab) => tab.id !== "overview" && tab.id !== "history"),
      ...tabs.filter((tab) => tab.id === "history"),
    ],
    [tabs]
  );
  const valid = (tabId: string) => ordered.some((tab) => tab.id === tabId);
  const [open, setOpen] = useState(() =>
    valid(kept) ? kept : (ordered[0]?.id ?? "")
  );
  // A link to ?tab=promotion opens that tab.
  // biome-ignore lint/correctness/useExhaustiveDependencies: follows the address only
  useEffect(() => {
    if (kept && valid(kept)) {
      setOpen(kept);
    }
  }, [kept]);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const choose = (next: string) => {
    setOpen(next);
    keep(next === ordered[0]?.id ? "" : next);
  };
  // Arrow keys move along the row (in reading order, so reversed in Arabic).
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const key = event.key as keyof typeof STEP | "Home" | "End";
    const here = ordered.findIndex((each) => each.id === open);
    let next: number;
    if (key === "Home") {
      next = 0;
    } else if (key === "End") {
      next = ordered.length - 1;
    } else if (key in STEP) {
      const step = STEP[key as keyof typeof STEP] * (rtl ? -1 : 1);
      next = (here + step + ordered.length) % ordered.length;
    } else {
      return;
    }
    event.preventDefault();
    const tab = ordered[next];
    if (tab) {
      choose(tab.id);
      buttons.current[next]?.focus();
    }
  };
  const shown = ordered.find((tab) => tab.id === open) ?? ordered[0];
  return (
    <div className="grid gap-8">
      <div
        aria-label={label}
        className="border-line flex flex-wrap gap-x-6 border-b"
        onKeyDown={onKeyDown}
        role="tablist"
      >
        {ordered.map((tab, index) => {
          const selected = tab.id === shown?.id;
          return (
            <button
              aria-controls={`${id}-${tab.id}-panel`}
              aria-selected={selected}
              className={cn(
                "hover:text-accent border-b-[1.5px] py-3 text-sm font-medium whitespace-nowrap",
                selected
                  ? "border-accent text-text"
                  : "text-text-secondary border-transparent"
              )}
              id={`${id}-${tab.id}`}
              key={tab.id}
              onClick={() => choose(tab.id)}
              ref={(el) => {
                buttons.current[index] = el;
              }}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {shown ? (
        <div
          aria-labelledby={`${id}-${shown.id}`}
          className="grid gap-10"
          id={`${id}-${shown.id}-panel`}
          role="tabpanel"
        >
          {shown.content}
        </div>
      ) : null}
    </div>
  );
};

/**
 * One section of a record: read as text, with its own Edit. Edit opens
 * the section's one form; its Save is in a bar that stays at the bottom of
 * the screen beside Cancel, and leaving with changes not saved asks first.
 * A section with nothing to edit leaves out `form`.
 */
export const EditableSection = ({
  children,
  form,
  id,
  title,
}: {
  /** What the section shows while reading. */
  readonly children: ReactNode;
  /** The section's one form; its SaveButton moves to the bar. */
  readonly form?: ReactNode;
  readonly id: string;
  readonly title: string;
}) => {
  const t = useTranslations("diwan.admin.kit.record");
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [asking, setAsking] = useState(false);
  const [bar, setBar] = useState<HTMLElement | null>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const region = useRef<HTMLDivElement>(null);

  // A browser reload or a closed tab asks before changes are lost.
  useEffect(() => {
    if (!dirty) {
      return;
    }
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (editing) {
      region.current
        ?.querySelector<HTMLElement>("input, textarea, [role=radio], button")
        ?.focus();
    }
  }, [editing]);

  const close = useCallback(() => {
    setEditing(false);
    setDirty(false);
    setAsking(false);
    requestAnimationFrame(() => editButton.current?.focus());
  }, []);
  const context = useMemo(() => ({ bar, saved: close }), [bar, close]);

  return (
    <DiwanSection
      action={
        form && !editing ? (
          <button
            className="link font-medium"
            onClick={() => setEditing(true)}
            ref={editButton}
            type="button"
          >
            {t("edit")}
          </button>
        ) : undefined
      }
      id={id}
      title={title}
    >
      {editing && form ? (
        <SectionFormContext.Provider value={context}>
          <div
            className="grid gap-6"
            onChange={() => setDirty(true)}
            onInput={() => setDirty(true)}
            ref={region}
          >
            {form}
          </div>
          <div className="border-line bg-surface sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-x-5 gap-y-2 border-t px-1 py-3">
            {asking ? (
              <>
                <p className="type-body" role="alert">
                  {t("discardAsk")}
                </p>
                <Button onClick={close} size="sm" variant="outline">
                  {t("discard")}
                </Button>
                <button
                  className="link text-text-secondary"
                  onClick={() => setAsking(false)}
                  type="button"
                >
                  {t("keepEditing")}
                </button>
              </>
            ) : (
              <>
                <span className="contents" ref={setBar} />
                <button
                  className="link text-text-secondary"
                  onClick={() => (dirty ? setAsking(true) : close())}
                  type="button"
                >
                  {t("cancel")}
                </button>
              </>
            )}
          </div>
        </SectionFormContext.Provider>
      ) : (
        children
      )}
    </DiwanSection>
  );
};

/** A read-only line in a section: the label, then the value. */
export const Fact = ({
  label,
  children,
}: {
  readonly children: ReactNode;
  readonly label: string;
}) => (
  <div className="grid gap-1 sm:grid-cols-[12rem_1fr] sm:gap-4">
    <dt className="type-label text-text-secondary">{label}</dt>
    <dd className="type-body min-w-0">{children}</dd>
  </div>
);

/** The facts of a section, one per line. */
export const Facts = ({ children }: { readonly children: ReactNode }) => (
  <dl className="grid max-w-3xl gap-4">{children}</dl>
);

/**
 * The header's menu for everything but the main action: a text link that
 * opens the actions in place, in a row (never a pop-up).
 */
export const RecordMenu = ({ children }: { readonly children: ReactNode }) => {
  const t = useTranslations("diwan.admin.kit.record");
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <button
        aria-controls={id}
        aria-expanded={open}
        className="link text-text-secondary"
        onClick={() => setOpen((was) => !was)}
        type="button"
      >
        {t("more")}
      </button>
      <div
        className="flex flex-wrap items-center gap-x-5 gap-y-2"
        hidden={!open}
        id={id}
      >
        {children}
      </div>
    </div>
  );
};

export interface NewRecordStep {
  readonly content: ReactNode;
  /** Whether the step may be left (its required fields filled). */
  readonly ready: boolean;
  readonly title: string;
}

/**
 * A new record, made in a few short steps ending in Review (decisions.md,
 * The site: "One record page"). The last step is the review the page
 * passes; Create sends the record.
 */
export const NewRecordSteps = ({
  creating,
  onCreate,
  steps,
}: {
  readonly creating: boolean;
  readonly onCreate: () => void;
  readonly steps: readonly NewRecordStep[];
}) => {
  const t = useTranslations("diwan.admin.kit.record");
  const [at, setAt] = useState(0);
  const step = steps[at];
  const last = at === steps.length - 1;
  // Each new step's title takes the focus, so it is read out.
  const focusTitle = useCallback((el: HTMLHeadingElement | null) => {
    el?.focus();
  }, []);
  if (!step) {
    return null;
  }
  return (
    <section className="grid max-w-3xl gap-6">
      <ol className="type-caption text-text-secondary flex flex-wrap gap-x-4 gap-y-1">
        {steps.map((s, index) => (
          <li
            aria-current={index === at ? "step" : undefined}
            className={cn(index === at && "text-text font-medium")}
            key={s.title}
          >
            {t("stepOf", {
              count: String(steps.length),
              step: String(index + 1),
            })}{" "}
            {s.title}
          </li>
        ))}
      </ol>
      <h2
        className="type-heading font-light"
        key={at}
        ref={focusTitle}
        tabIndex={-1}
      >
        {step.title}
      </h2>
      {step.content}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {last ? (
          <Button disabled={creating || !step.ready} onClick={onCreate}>
            {creating ? t("creating") : t("create")}
          </Button>
        ) : (
          <Button disabled={!step.ready} onClick={() => setAt(at + 1)}>
            {t("next")}
          </Button>
        )}
        {at > 0 ? (
          <button
            className="link text-text-secondary"
            onClick={() => setAt(at - 1)}
            type="button"
          >
            {t("back")}
          </button>
        ) : null}
      </div>
    </section>
  );
};
