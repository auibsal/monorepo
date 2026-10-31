"use client";

import { Icon } from "@repo/design-system/components/sal/icon";
import { cn } from "@repo/design-system/lib/utils";
import { useTranslations } from "next-intl";
import {
  type ChangeEvent,
  Children,
  type ComponentProps,
  isValidElement,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

interface Choice {
  readonly disabled: boolean;
  readonly group: string | null;
  readonly label: ReactNode;
  readonly text: string;
  readonly value: string;
}

/** The words of an option, for finding it by typing. */
const textOf = (node: ReactNode): string => {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(textOf).join("");
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return textOf(node.props.children);
  }
  return "";
};

/** Reads option and optgroup children into a flat list. */
const readChoices = (children: ReactNode, group: string | null = null) => {
  const out: Choice[] = [];
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) {
      continue;
    }
    const element = child as ReactElement<{
      children?: ReactNode;
      disabled?: boolean;
      label?: string;
      value?: string | number;
    }>;
    if (element.type === "option") {
      const { children: label, disabled, value } = element.props;
      out.push({
        disabled: Boolean(disabled),
        group,
        label,
        text: textOf(label),
        value: String(value ?? textOf(label)),
      });
    } else if (element.type === "optgroup") {
      out.push(
        ...readChoices(element.props.children, element.props.label ?? null)
      );
    } else {
      out.push(...readChoices(element.props.children, group));
    }
  }
  return out;
};

interface OptionRowProps {
  readonly choice: Choice;
  readonly first: boolean;
  readonly heading: string | null;
  readonly on: boolean;
  readonly onPick: () => void;
  /** Brings the chosen option into view when the list opens. */
  readonly reveal: boolean;
}

/** One choice in an open list, under its group's name when it starts one. */
const OptionRow = ({
  choice,
  first,
  heading,
  on,
  onPick,
  reveal,
}: OptionRowProps) => (
  <>
    {heading ? (
      <span className="type-label border-line border-t px-3 pt-4 pb-1 text-text-secondary">
        {heading}
      </span>
    ) : null}
    <div
      aria-disabled={choice.disabled || undefined}
      aria-selected={on}
      className={cn(
        "flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 py-2 outline-none",
        first || heading ? "" : "border-line border-t",
        "hover:bg-surface-reading focus-visible:bg-surface-reading",
        on ? "text-accent" : "text-text",
        choice.disabled ? "cursor-default opacity-50" : ""
      )}
      onClick={() => {
        if (!choice.disabled) {
          onPick();
        }
      }}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && !choice.disabled) {
          event.preventDefault();
          onPick();
        }
      }}
      ref={(node) => {
        if (node && on && reveal) {
          node.scrollIntoView({ block: "nearest" });
        }
      }}
      role="option"
      tabIndex={-1}
    >
      <span>{choice.label}</span>
      {on ? <Icon className="size-4 shrink-0" name="check" /> : null}
    </div>
  </>
);

/** Up to this many choices sit in one row; more open as a list. */
const ROW = 4;
/** Choices longer than this many letters open as a list. */
const SHORT = 32;
/** From this many, the list can be narrowed by typing. */
const FIND = 10;

export type ChoiceInputProps = Omit<
  ComponentProps<"select">,
  "onChange" | "value" | "defaultValue"
> & {
  readonly defaultValue?: string | number;
  readonly onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  readonly value?: string | number;
};

/**
 * Choosing one of several, on the page itself (owner, Oct 31, 2026: never a
 * dialog or the browser's own pop-up list). It takes the same option and
 * optgroup children, `value` and `onChange` as a select. A few short
 * choices stand in one row and the chosen one is underlined; more open as a
 * list under the field, pushing the page down rather than covering it, with
 * a line to type in once there are many. Hairlines, square corners, no
 * shadows, as the brand book asks.
 */
export const ChoiceInput = ({
  "aria-describedby": describedBy,
  "aria-label": ariaLabel,
  children,
  className,
  defaultValue,
  disabled = false,
  id,
  name,
  onChange,
  required = false,
  value: controlled,
}: ChoiceInputProps) => {
  const t = useTranslations("nexus.admin.kit.choices");
  const fallbackId = useId();
  const baseId = id ?? fallbackId;
  const listId = `${baseId}-list`;
  const [own, setOwn] = useState(String(defaultValue ?? ""));
  const value = controlled === undefined ? own : String(controlled);
  const [open, setOpen] = useState(false);
  const [find, setFind] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // The field's label names the choices, wherever the label was written.
  useEffect(() => {
    const label = document.querySelector<HTMLLabelElement>(
      `label[for="${CSS.escape(baseId)}"]`
    );
    if (label && !label.id) {
      label.id = `${baseId}-label`;
    }
  }, [baseId]);

  const choices = readChoices(children);
  const chosen = choices.find((c) => c.value === value);
  const grouped = choices.some((c) => c.group);
  const asRow =
    !grouped &&
    ROW >= choices.length &&
    choices.every((c) => SHORT >= c.text.length);

  const choose = (next: string) => {
    if (controlled === undefined) {
      setOwn(next);
    }
    const target = { name, value: next } as HTMLSelectElement;
    onChange?.({
      currentTarget: target,
      target,
    } as ChangeEvent<HTMLSelectElement>);
  };

  // Keeps `required` and plain form posts working without a select.
  const carrier = (
    <input
      aria-hidden
      className="pointer-events-none absolute start-0 bottom-0 h-px w-px opacity-0"
      disabled={disabled}
      name={name}
      onChange={() => undefined}
      onFocus={() => buttonRef.current?.focus()}
      required={required}
      tabIndex={-1}
      value={value}
    />
  );

  if (asRow) {
    const shown = required ? choices.filter((c) => c.value !== "") : choices;
    const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      const step = { ArrowDown: 1, ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1 }[
        event.key
      ];
      if (!step) {
        return;
      }
      event.preventDefault();
      const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
      const horizontal =
        event.key === "ArrowLeft" || event.key === "ArrowRight";
      const delta = rtl && horizontal ? -step : step;
      const next = shown[(index + delta + shown.length) % shown.length];
      if (next && !next.disabled) {
        choose(next.value);
        const buttons =
          event.currentTarget.parentElement?.querySelectorAll("button");
        buttons?.[shown.indexOf(next)]?.focus();
      }
    };
    return (
      <div
        aria-describedby={describedBy}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : `${baseId}-label`}
        className={cn(
          "relative flex min-h-12 flex-wrap items-center gap-x-6 gap-y-2 border-line border-b",
          className
        )}
        id={baseId}
        role="radiogroup"
      >
        {shown.map((choice, index) => {
          const on = choice.value === value;
          return (
            // biome-ignore lint/a11y/useSemanticElements: a row of words, underlined when chosen, reads better than radio circles
            <button
              aria-checked={on}
              className={cn(
                "-mb-px border-b-2 py-2 text-start text-base transition-colors",
                on
                  ? "border-accent text-text"
                  : "border-transparent text-text-secondary hover:text-text",
                "disabled:opacity-50"
              )}
              disabled={disabled || choice.disabled}
              key={choice.value}
              onClick={() => choose(choice.value)}
              onKeyDown={(event) => move(event, index)}
              role="radio"
              tabIndex={on || (!chosen && index === 0) ? 0 : -1}
              type="button"
            >
              {choice.label}
            </button>
          );
        })}
        {carrier}
      </div>
    );
  }

  const words = find.trim().toLowerCase();
  const listed = words
    ? choices.filter((c) => c.text.toLowerCase().includes(words))
    : choices;

  const close = () => {
    setOpen(false);
    setFind("");
    buttonRef.current?.focus();
  };
  const focusOption = (index: number) => {
    const items = listRef.current?.querySelectorAll<HTMLElement>(
      "[role=option]:not([aria-disabled=true])"
    );
    if (!items?.length) {
      return;
    }
    const at = (index + items.length) % items.length;
    items[at]?.focus();
  };
  const onListKey = (event: KeyboardEvent<HTMLElement>) => {
    const items = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>(
        "[role=option]:not([aria-disabled=true])"
      ) ?? []
    );
    const at = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusOption(at + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusOption(at <= 0 ? items.length - 1 : at - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusOption(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusOption(items.length - 1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  let lastGroup: string | null = null;
  return (
    <div className={cn("relative grid", className)}>
      <button
        aria-controls={open ? listId : undefined}
        aria-describedby={describedBy}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={cn(
          "flex h-12 w-full items-center justify-between gap-3 border border-input bg-surface px-3 text-start text-base",
          "focus-visible:outline-2 disabled:opacity-50",
          chosen && chosen.value !== "" ? "text-text" : "text-text-secondary"
        )}
        disabled={disabled}
        id={baseId}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        ref={buttonRef}
        type="button"
      >
        <span className="truncate">{chosen ? chosen.label : t("choose")}</span>
        <Icon
          className={cn("size-4 shrink-0 transition-transform", {
            "rotate-180": open,
          })}
          name="chevron-down"
        />
      </button>
      {carrier}
      {open ? (
        <div className="grid border-line border-x border-b bg-surface">
          {choices.length >= FIND ? (
            <div className="flex items-center gap-2 border-line border-b px-3">
              <Icon className="size-4 text-text-secondary" name="search" />
              <input
                aria-controls={listId}
                aria-label={t("find")}
                className="h-11 w-full bg-transparent text-base outline-none"
                dir="auto"
                onChange={(event) => setFind(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    focusOption(0);
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    close();
                  } else if (event.key === "Enter") {
                    event.preventDefault();
                    const first = listed.find((c) => !c.disabled);
                    if (first) {
                      choose(first.value);
                      close();
                    }
                  }
                }}
                placeholder={t("find")}
                value={find}
              />
            </div>
          ) : null}
          <div
            aria-labelledby={baseId}
            className="grid max-h-80 overflow-y-auto"
            id={listId}
            onKeyDown={onListKey}
            ref={listRef}
            role="listbox"
            tabIndex={-1}
          >
            {listed.length === 0 ? (
              <p className="px-3 py-3 text-text-secondary">{t("none")}</p>
            ) : null}
            {listed.map((choice, index) => {
              const heading =
                choice.group && choice.group !== lastGroup
                  ? choice.group
                  : null;
              lastGroup = choice.group;
              return (
                <OptionRow
                  choice={choice}
                  first={index === 0}
                  heading={heading}
                  key={`${choice.group}-${choice.value}`}
                  on={choice.value === value}
                  onPick={() => {
                    choose(choice.value);
                    close();
                  }}
                  reveal={!find}
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};
