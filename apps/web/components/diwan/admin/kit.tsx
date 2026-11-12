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
import { Textarea } from "@repo/brand/components/ui/textarea";
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
  useRef,
  useState,
} from "react";
import { DateInput } from "@/components/fields/date-input";
import { useAuth } from "@/lib/auth/provider";
import { DataError } from "@/lib/data";
import { ApiError, callApiText } from "@/lib/diwan/api";
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
    <div className="gap-x-space-4 flex flex-wrap items-end justify-between gap-y-3">
      <h1 className="type-title font-light text-balance">{title}</h1>
      {actions ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {actions}
        </div>
      ) : null}
    </div>
    {children ? (
      <div className="type-lede text-text-secondary max-w-[60ch]">
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
      .schema("governance")
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
