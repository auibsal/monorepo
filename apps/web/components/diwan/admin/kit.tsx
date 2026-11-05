"use client";

import { useAuth } from "@repo/auth/provider";
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
import { DataError } from "@repo/sal-data";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { DateInput } from "@/components/fields/date-input";
import { callApiText } from "@/lib/diwan/api";
import { useAppLink } from "@/lib/link-context";
import { ChoiceInput } from "./choice-input";

// ── Page heading ────────────────────────────────────────────────────────────

interface AdminHeadingProps {
  readonly actions?: ReactNode;
  readonly children?: ReactNode;
  readonly title: string;
}

/** The top of an admin page: title, optional lede and actions at the end. */
export const AdminHeading = ({
  actions,
  children,
  title,
}: AdminHeadingProps) => (
  <header className="grid gap-3">
    <div className="flex flex-wrap items-end justify-between gap-x-space-4 gap-y-3">
      <h1 className="type-title text-balance font-light">{title}</h1>
      {actions ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {actions}
        </div>
      ) : null}
    </div>
    {children ? (
      <div className="type-lede max-w-[60ch] text-text-secondary">
        {children}
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
      className="grid max-w-3xl gap-4 border-line border-t pt-space-4"
      ref={region}
    >
      {children(close)}
      <button
        className="link justify-self-start text-text-secondary"
        onClick={close}
        type="button"
      >
        {t("cancel")}
      </button>
    </section>
  );
};

/**
 * A new or edited record's own page: its title, the way back to its list,
 * and the form. Saving returns to the list.
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
    <div className="grid max-w-3xl gap-8">
      <AdminHeading
        actions={
          <AppLink className="link" href={back}>
            {backLabel}
          </AppLink>
        }
        title={title}
      >
        {lede}
      </AdminHeading>
      {children}
    </div>
  );
};

// ── Tables ──────────────────────────────────────────────────────────────────

export interface Column<T> {
  readonly cell: (row: T) => ReactNode;
  readonly className?: string;
  readonly header: string;
  /** Shown in the head in place of the header's words (a select-all box). */
  readonly headerCell?: ReactNode;
  readonly key: string;
}

interface DataTableProps<T> {
  readonly caption?: string;
  readonly columns: readonly Column<T>[];
  readonly empty?: string;
  readonly rowKey: (row: T) => string;
  readonly rows: readonly T[];
}

/**
 * Brand tables: a crimson hairline under the head and gray hairlines
 * between rows, never full grids. On phones each row stacks into a block,
 * the first column as its title and the rest labelled, so nothing scrolls
 * sideways (brand book, Screens: Phones).
 */
export const DataTable = <T,>({
  caption,
  columns,
  empty,
  rowKey,
  rows,
}: DataTableProps<T>) => {
  const t = useTranslations("diwan.admin.kit");

  if (rows.length === 0) {
    return (
      <p className="type-body py-6 text-text-secondary">
        {empty ?? t("empty")}
      </p>
    );
  }

  return (
    <div className="w-full md:overflow-x-auto">
      <table className="w-full border-collapse text-sm max-md:block">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className="max-md:sr-only">
          <tr className="border-text border-b">
            {columns.map((column) => (
              <th
                className={cn(
                  "type-label whitespace-nowrap px-2 py-3 text-start align-bottom",
                  column.className
                )}
                key={column.key}
                scope="col"
              >
                {column.headerCell ?? column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="max-md:block max-md:border-line max-md:border-t">
          {rows.map((row) => (
            <tr
              className="border-line border-b max-md:grid max-md:gap-1.5 max-md:py-3"
              key={rowKey(row)}
            >
              {columns.map((column, index) => (
                <td
                  className={cn(
                    "px-2 py-3 align-top",
                    column.className,
                    "max-md:whitespace-normal max-md:px-0 max-md:py-0 max-md:text-start",
                    index === 0
                      ? "max-md:block max-md:font-medium max-md:text-base"
                      : "max-md:grid max-md:grid-cols-[minmax(6rem,35%)_1fr] max-md:items-baseline max-md:gap-3"
                  )}
                  key={column.key}
                >
                  {index > 0 && column.header ? (
                    <span className="type-label md:hidden">
                      {column.header}
                    </span>
                  ) : null}
                  {index > 0 && !column.header ? (
                    <span className="md:hidden" />
                  ) : null}
                  <span className="min-w-0 break-words max-md:block md:contents">
                    {column.cell(row)}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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

interface FieldProps {
  readonly children: (id: string) => ReactNode;
  readonly className?: string;
  readonly hint?: string;
  readonly label: string;
}

/** A labeled field; the render prop receives the control's id. */
export const Field = ({ children, className, hint, label }: FieldProps) => {
  const id = useId();
  return (
    <div className={cn("grid content-start gap-2", className)}>
      <Label htmlFor={id} id={`${id}-label`}>
        {label}
      </Label>
      {children(id)}
      {hint ? <p className="type-caption">{hint}</p> : null}
    </div>
  );
};

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
      <legend className="mb-2 font-medium text-sm">{label}</legend>
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
 * One of several choices, on the page (owner, Oct 31, 2026: never the
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
  return null;
};

export const useErrorReason = () => {
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
    <p className="text-sm text-text" role="alert">
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
  let label = t("save");
  if (pending) {
    label = t("saving");
  } else if (success) {
    label = t("saved");
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
  /** the API routes export name (apps/web/lib/api/exports.ts). */
  readonly name: string;
  readonly params?: Record<string, string>;
}

/** Downloads a CSV from the API routes, which re-checks the permission. */
export const ExportButton = ({
  fileName,
  name,
  params = {},
}: ExportButtonProps) => {
  const t = useTranslations("diwan.admin.kit");
  const { supabase } = useAuth();
  const [state, setState] = useState<"idle" | "busy" | "failed">("idle");

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
    } catch {
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
        {state === "busy" ? t("exporting") : t("export")}
      </Button>
      {state === "failed" ? (
        <p className="text-text text-xs" role="alert">
          {t("exportFailed")}
        </p>
      ) : null}
    </div>
  );
};
