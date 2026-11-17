"use client";

import { DataTable as BrandDataTable } from "@repo/brand/components/sal/data-table";
import { Field } from "@repo/brand/components/sal/field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/brand/components/ui/alert-dialog";
import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import { Textarea } from "@repo/brand/components/ui/textarea";
import { cn } from "@repo/brand/lib/utils";
import {
  formatNumber,
  fromZonedInputValue,
  toZonedInputValue,
} from "@repo/internationalization/format";
import { useTranslations } from "next-intl";
import {
  type ComponentProps,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { DateInput } from "@/components/fields/date-input";
import { useAuth } from "@/lib/auth/provider";
import { DataError } from "@/lib/data";
import { ApiError, callApiText } from "@/lib/diwan/api";
import { useQueryState } from "@/lib/diwan/use-query-param";
import { useAppLink } from "@/lib/link-context";
import { ChoiceInput } from "./choice-input";
import { RecordMenu, type RecordTab, RecordTabs } from "./record";
import { useSectionForm } from "./section-form";

// ── Page heading ────────────────────────────────────────────────────────────

interface AdminHeadingProps {
  readonly actions?: ReactNode;
  readonly children?: ReactNode;
  /** A record's status, under its title ("Status: Published"). */
  readonly status?: ReactNode;
  readonly title: string;
}

/**
 * The top of an admin page, in the one page order (decisions.md, The site:
 * "Pages and actions"): its title, one sentence, its main action, then
 * everything else.
 */
export const AdminHeading = ({
  actions,
  children,
  status,
  title,
}: AdminHeadingProps) => (
  <header className="grid gap-3">
    <h1 className="type-title font-light text-balance">{title}</h1>
    {status ? <p className="type-label">{status}</p> : null}
    {children ? (
      <div className="type-lede text-text-secondary max-w-[60ch]">
        {children}
      </div>
    ) : null}
    {actions ? (
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {actions}
      </div>
    ) : null}
  </header>
);

/**
 * The way to a blank big record (an event, a piece, a partner …): its own
 * page at its list's path and "/new". A text link, so the page keeps its
 * one accent action. Small rows use `AddInPlace` instead (decisions §26).
 */
export const NewLink = ({
  children,
  href,
}: {
  readonly children: ReactNode;
  readonly href: string;
}) => {
  const AppLink = useAppLink();
  return (
    <AppLink className="link justify-self-start font-medium" href={href}>
      {children}
    </AppLink>
  );
};

/**
 * A small row added on its own list (a need, a shift, a credit, a ledger
 * line …; decisions §26): a text link that opens the form in place, under
 * the list, pushing the page down (never a dialog). The form gets `close`,
 * which it calls once saved; Cancel closes it too. Focus moves into the
 * form when it opens and back to the link when it closes.
 */
export const AddInPlace = ({
  children,
  label,
}: {
  readonly children: (close: () => void) => ReactNode;
  readonly label: string;
}) => {
  const t = useTranslations("diwan.admin.kit");
  const [open, setOpen] = useState(false);
  const region = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) {
      region.current
        ?.querySelector<HTMLElement>("input, textarea, button, [tabindex]")
        ?.focus();
    }
  }, [open]);
  const close = () => {
    setOpen(false);
    // The link is back once React has rendered; return focus to it.
    requestAnimationFrame(() => opener.current?.focus());
  };
  if (!open) {
    return (
      <button
        className="link justify-self-start font-medium"
        onClick={() => setOpen(true)}
        ref={opener}
        type="button"
      >
        {label}
      </button>
    );
  }
  return (
    <section
      aria-label={label}
      className="border-line pt-space-4 grid max-w-3xl gap-4 border-t"
      ref={region}
    >
      {children(close)}
      <button
        className="link text-text-secondary justify-self-start"
        onClick={close}
        type="button"
      >
        {t("cancel")}
      </button>
    </section>
  );
};

/**
 * One record page (decisions.md, The site: "One record page") for every
 * record in Your account and the Diwan: the way back to its list, its
 * title, status, one main action, the details, then History (passed in
 * as `history`, last).
 */
export const RecordView = ({
  actions,
  back,
  children,
  history,
  lede,
  menu,
  narrow = false,
  status,
  tabs,
  title,
}: {
  /** The one main action, then any link out ("On the site"). */
  readonly actions?: ReactNode;
  /** The way back to its list, a link. */
  readonly back?: ReactNode;
  /** The record's Overview. */
  readonly children: ReactNode;
  /** The record's History, its last tab. */
  readonly history?: ReactNode;
  readonly lede?: ReactNode;
  /** Everything but the main action, under More. */
  readonly menu?: ReactNode;
  readonly narrow?: boolean;
  readonly status?: ReactNode;
  /** The record's other tabs, between Overview and History. */
  readonly tabs?: readonly RecordTab[];
  readonly title: string;
}) => {
  const t = useTranslations("diwan.admin.kit.record");
  const tabbed = Boolean(history || tabs?.length);
  return (
    <div className={cn("grid gap-10", narrow && "max-w-3xl")}>
      <div className="grid gap-3">
        {back ? <div className="type-caption">{back}</div> : null}
        <AdminHeading
          actions={
            actions || menu ? (
              <>
                {actions}
                {menu ? <RecordMenu>{menu}</RecordMenu> : null}
              </>
            ) : undefined
          }
          status={status}
          title={title}
        >
          {lede}
        </AdminHeading>
      </div>
      {tabbed ? (
        <RecordTabs
          label={t("tabsLabel")}
          tabs={[
            { content: children, id: "overview", label: t("overview") },
            ...(tabs ?? []),
            ...(history
              ? [{ content: history, id: "history", label: t("history") }]
              : []),
          ]}
        />
      ) : (
        children
      )}
    </div>
  );
};

/**
 * A new or edited record's own page: the same record page, with the way
 * back to its list and the form. Saving returns to the list.
 */
export const RecordPage = ({
  back,
  backLabel,
  children,
  lede,
  title,
}: {
  readonly back: string;
  readonly backLabel: string;
  readonly children: ReactNode;
  readonly lede?: ReactNode;
  readonly title: string;
}) => {
  const AppLink = useAppLink();
  return (
    <RecordView
      back={
        <AppLink className="link" href={back}>
          {backLabel}
        </AppLink>
      }
      lede={lede}
      narrow
      title={title}
    >
      {children}
    </RecordView>
  );
};

/**
 * One list (decisions.md, The site: "One list") for every list of records
 * in Your account and the Diwan: a find line kept in the query string
 * (`?q=`), any filters beside it (also query strings), the rows, and the
 * empty state with one next action.
 */
export const RecordList = <T,>({
  children,
  empty,
  filters,
  items,
  matches,
  needsYou,
}: {
  /** The rows found, drawn by the page (a RowList or a DataTable). */
  readonly children: (found: readonly T[]) => ReactNode;
  /** What shows when nothing is there or nothing is found. */
  readonly empty: ReactNode;
  readonly filters?: ReactNode;
  readonly items: readonly T[];
  /** Whether a row matches the find line (already lowercased). */
  readonly matches: (item: T, query: string) => boolean;
  /**
   * The list opens on "Needs you": what waits on this person or seat,
   * oldest first; "All" shows everything, newest first (decisions.md, The
   * site: "One list").
   */
  readonly needsYou?: {
    readonly date: (item: T) => string | null | undefined;
    readonly test: (item: T) => boolean;
  };
}) => {
  const t = useTranslations("diwan.admin.kit");
  const id = useId();
  const [query, setQuery] = useQueryState("q");
  const [kept, keep] = useQueryState("view");
  const [view, setView] = useState(kept === "all" ? "all" : "needs");
  const [typed, setTyped] = useState(query);
  const needle = typed.trim().toLowerCase();
  const byDate = (direction: 1 | -1) => (x: T, y: T) =>
    direction *
    String(needsYou?.date(x) ?? "").localeCompare(
      String(needsYou?.date(y) ?? "")
    );
  const waiting = needsYou ? items.filter(needsYou.test) : [];
  let listed = items;
  if (needsYou) {
    listed =
      view === "needs"
        ? [...waiting].sort(byDate(1))
        : [...items].sort(byDate(-1));
  }
  const found = needle
    ? listed.filter((item) => matches(item, needle))
    : listed;
  const choose = (next: "all" | "needs") => {
    setView(next);
    keep(next === "all" ? "all" : "");
  };
  return (
    <div className="grid gap-5">
      {needsYou ? (
        <div className="border-line flex flex-wrap gap-x-6 border-b">
          {(["needs", "all"] as const).map((v) => (
            <button
              aria-pressed={view === v}
              className={cn(
                "hover:text-accent border-b-[1.5px] py-3 text-sm font-medium whitespace-nowrap",
                view === v
                  ? "border-accent text-text"
                  : "text-text-secondary border-transparent"
              )}
              key={v}
              onClick={() => choose(v)}
              type="button"
            >
              {v === "needs" ? t("needsYou") : t("all")}
              {v === "needs" && waiting.length > 0 ? (
                <span className="text-accent ms-1.5">
                  {formatNumber(waiting.length)}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-2">
          <Label htmlFor={`${id}-q`}>{t("find")}</Label>
          <Input
            className="w-72 max-w-full"
            id={`${id}-q`}
            onChange={(e) => {
              setTyped(e.target.value);
              setQuery(e.target.value);
            }}
            placeholder={t("findPlaceholder")}
            type="search"
            value={typed}
          />
        </div>
        {filters}
      </div>
      {found.length === 0 ? empty : children(found)}
    </div>
  );
};

// ── Tables ──────────────────────────────────────────────────────────────────

export type { Column } from "@repo/brand/components/sal/data-table";

type DataTableProps<T> = Omit<
  ComponentProps<typeof BrandDataTable<T>>,
  "empty"
> & { readonly empty?: string };

/** The design system's DataTable, with the kit's empty line by default. */
export const DataTable = <T,>({ empty, ...props }: DataTableProps<T>) => {
  const t = useTranslations("diwan.admin.kit");
  return <BrandDataTable<T> {...props} empty={empty ?? t("empty")} />;
};

export const RowCount = ({ count }: { count: number }) => {
  const t = useTranslations("diwan.admin.kit");
  return (
    <p className="type-caption" role="status">
      {t("rows", { count, countText: formatNumber(count) })}
    </p>
  );
};

// ── Fields ──────────────────────────────────────────────────────────────────

export { Field } from "@repo/brand/components/sal/field";

interface BilingualProps {
  readonly label: string;
  readonly maxLength?: number;
  readonly multiline?: boolean;
  readonly onChange: (value: { ar: string; en: string }) => void;
  readonly required?: boolean;
  readonly rows?: number;
  readonly value: { ar: string; en: string };
}

/**
 * A paired `_en` / `_ar` field: English left-to-right, Arabic right-to-left
 * with `lang="ar"`, side by side on wide screens.
 */
export const BilingualField = ({
  label,
  maxLength,
  multiline = false,
  onChange,
  required = false,
  rows = 4,
  value,
}: BilingualProps) => {
  const t = useTranslations("diwan.admin.kit");
  const Control = multiline ? Textarea : Input;
  return (
    <fieldset className="grid gap-3 sm:grid-cols-2">
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <Field label={t("english")}>
        {(id) => (
          <Control
            dir="ltr"
            id={id}
            lang="en"
            maxLength={maxLength}
            onChange={(e) => onChange({ ...value, en: e.target.value })}
            required={required}
            rows={multiline ? rows : undefined}
            value={value.en}
          />
        )}
      </Field>
      <Field label={t("arabic")}>
        {(id) => (
          <Control
            dir="rtl"
            id={id}
            lang="ar"
            maxLength={maxLength}
            onChange={(e) => onChange({ ...value, ar: e.target.value })}
            required={required}
            rows={multiline ? rows : undefined}
            value={value.ar}
          />
        )}
      </Field>
    </fieldset>
  );
};

interface DateTimeFieldProps {
  readonly label: string;
  readonly onChange: (iso: string | null) => void;
  readonly required?: boolean;
  /** An ISO instant (UTC), or null. */
  readonly value: string | null;
}

/** Shown and entered as Baghdad wall-clock time; stored as UTC. */
export const DateTimeField = ({
  label,
  onChange,
  required = false,
  value,
}: DateTimeFieldProps) => {
  const t = useTranslations("diwan.admin.kit");
  return (
    <Field hint={t("baghdadTime")} label={label}>
      {(id) => (
        <DateInput
          id={id}
          onChange={(e) => onChange(fromZonedInputValue(e.target.value))}
          required={required}
          type="datetime-local"
          value={toZonedInputValue(value)}
        />
      )}
    </Field>
  );
};

/** A native select, styled like the inputs (works with keyboards and RTL). */
/**
 * One of several choices, on the page (decisions.md: never the
 * browser's pop-up list or a dialog). See `ChoiceInput`.
 */
export const SelectInput = ChoiceInput;

// ── Actions ─────────────────────────────────────────────────────────────────

/** Maps a Postgres or API error to a plain reason for the person. */
/** Errors with a sentence of their own: shared addresses, a trip waiting. */
const namedReason = (error: unknown, code: string) => {
  if (!(error instanceof Error)) {
    return null;
  }
  // Programs and events share the addresses under /events.
  if (code === "23505" && error.message.includes("belongs to a program")) {
    return "addressProgram" as const;
  }
  if (code === "23505" && error.message.includes("belongs to an event")) {
    return "addressEvent" as const;
  }
  // A trip to al-Mutanabbi Street waits for Student Life (A34).
  if (error.message.includes("trip_needs_approval")) {
    return "tripNeedsApproval" as const;
  }
  // An organization's logo is at least 600 pixels high (decisions.md, Partners).
  if (error.message.includes("logo_too_small")) {
    return "logoTooSmall" as const;
  }
  return null;
};

const useErrorReason = () => {
  const t = useTranslations("diwan.admin.kit");
  return (error: unknown) => {
    const code = error instanceof DataError ? error.code : "";
    const named = namedReason(error, code);
    if (named) {
      return t(named);
    }
    let reason = t("reasons.unknown");
    if (code === "42501") {
      reason = t("reasons.forbidden");
    } else if (code === "23505") {
      reason = t("reasons.conflict");
    } else if (code.startsWith("22") || code.startsWith("23")) {
      reason = t("reasons.invalid");
    }
    return t("actionFailed", { reason });
  };
};

export const ErrorLine = ({ error }: { error: unknown }) => {
  const reason = useErrorReason();
  return error ? (
    <p className="text-text text-sm" role="alert">
      {reason(error)}
    </p>
  ) : null;
};

interface ConfirmActionProps {
  readonly children: ReactNode;
  readonly confirmLabel: string;
  readonly description: string;
  readonly disabled?: boolean;
  readonly onConfirm: () => void;
  readonly variant?: "default" | "outline" | "ghost";
}

/** Every destructive or money action asks first (brief §8). */
export const ConfirmAction = ({
  children,
  confirmLabel,
  description,
  disabled = false,
  onConfirm,
  variant = "outline",
}: ConfirmActionProps) => {
  const t = useTranslations();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button disabled={disabled} size="sm" variant={variant}>
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("diwan.admin.kit.confirmTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

interface SaveButtonProps {
  readonly disabled?: boolean;
  readonly pending: boolean;
  /** Beside the page's one accent action (Publish), Save steps back. */
  readonly quiet?: boolean;
  readonly success?: boolean;
}

export const SaveButton = ({
  disabled = false,
  pending,
  quiet = false,
  success = false,
}: SaveButtonProps) => {
  const t = useTranslations("common");
  const section = useSectionForm();
  const anchor = useRef<HTMLSpanElement>(null);
  const wasSaving = useRef(false);
  // Inside a section being edited, a finished save closes the form.
  useEffect(() => {
    if (pending) {
      wasSaving.current = true;
    } else if (success && wasSaving.current) {
      wasSaving.current = false;
      section?.saved();
    }
  }, [pending, success, section]);
  let label = t("save");
  if (pending) {
    label = t("saving");
  } else if (success) {
    label = t("saved");
  }
  if (section) {
    // The one Save, in the section's sticky bar; it submits this form.
    return (
      <>
        <span hidden ref={anchor} />
        {section.bar
          ? createPortal(
              <Button
                disabled={disabled || pending}
                onClick={() => anchor.current?.closest("form")?.requestSubmit()}
                type="button"
              >
                {label}
              </Button>,
              section.bar
            )
          : null}
      </>
    );
  }
  return (
    <Button
      className="justify-self-start"
      disabled={disabled || pending}
      size={quiet ? "sm" : "default"}
      type="submit"
      variant={quiet ? "outline" : "default"}
    >
      {label}
    </Button>
  );
};

interface ExportButtonProps {
  readonly fileName: string;
  /** What the file is, when "Export" alone wouldn't say. */
  readonly label?: string;
  /** the API routes export name (apps/web/lib/api/exports.ts). */
  readonly name: string;
  readonly params?: Record<string, string>;
}

/** Downloads a CSV from the API routes, which re-checks the permission. */
export const ExportButton = ({
  fileName,
  label,
  name,
  params = {},
}: ExportButtonProps) => {
  const t = useTranslations("diwan.admin.kit");
  const { supabase } = useAuth();
  const [state, setState] = useState<"idle" | "busy" | "failed" | "asked">(
    "idle"
  );

  // A list for Student Life needs a second officer: the first press asks.
  const ask = async () => {
    const { error } = await supabase
      .schema("api")
      .rpc("request_export", { name, params });
    setState(error ? "failed" : "asked");
  };

  const run = async () => {
    setState("busy");
    try {
      const csv = await callApiText(supabase, `/exports/${name}`, params);
      const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" })
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      setState("idle");
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === "second_officer_required"
      ) {
        await ask();
        return;
      }
      setState("failed");
    }
  };

  return (
    <div className="grid gap-1">
      <Button
        disabled={state === "busy"}
        onClick={run}
        size="sm"
        variant="outline"
      >
        {state === "busy" ? t("exporting") : (label ?? t("export"))}
      </Button>
      {state === "asked" ? (
        <p className="text-text text-xs" role="status">
          {t("exportAsked")}
        </p>
      ) : null}
      {state === "failed" ? (
        <p className="text-text text-xs" role="alert">
          {t("exportFailed")}
        </p>
      ) : null}
    </div>
  );
};
