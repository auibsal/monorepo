"use client";

import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { formatNumber } from "@repo/internationalization/format";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { type Column, DataTable } from "./kit";

/**
 * A long list whose rows can be chosen and acted on together (the design
 * review A40): a box on each row and one in the head for every row, and,
 * once rows are chosen, a line above the list saying how many with the
 * actions that apply to them all. Rows that leave the list leave the
 * choice.
 */
export const SelectableTable = <T,>({
  actions,
  caption,
  columns,
  empty,
  label,
  rowKey,
  rows,
}: {
  readonly actions: (chosen: readonly T[], clear: () => void) => ReactNode;
  readonly caption?: string;
  readonly columns: readonly Column<T>[];
  readonly empty?: string;
  /** What the box on a row says, for screen readers: "Choose Lina Ali". */
  readonly label: (row: T) => string;
  readonly rowKey: (row: T) => string;
  readonly rows: readonly T[];
}) => {
  const t = useTranslations("nexus.admin.kit.selection");
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const chosen = rows.filter((row) => picked.has(rowKey(row)));
  const all = rows.length > 0 && chosen.length === rows.length;
  const clear = () => setPicked(new Set());
  let headState: boolean | "indeterminate" = all;
  if (!all && chosen.length > 0) {
    headState = "indeterminate";
  }
  const toggle = (id: string, on: boolean) =>
    setPicked((current) => {
      const next = new Set(current);
      if (on) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  const boxColumn: Column<T> = {
    cell: (row) => (
      <Checkbox
        aria-label={label(row)}
        checked={picked.has(rowKey(row))}
        onCheckedChange={(v) => toggle(rowKey(row), v === true)}
      />
    ),
    className: "w-10",
    header: t("choose"),
    headerCell: (
      <Checkbox
        aria-label={t("all")}
        checked={headState}
        onCheckedChange={(v) =>
          setPicked(v === true ? new Set(rows.map(rowKey)) : new Set())
        }
      />
    ),
    key: "choose",
  };
  return (
    <div className="grid gap-3">
      {chosen.length > 0 ? (
        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-2 border-line border-y py-2"
          role="toolbar"
        >
          <p className="type-caption" role="status">
            {t("chosen", {
              count: chosen.length,
              countText: formatNumber(chosen.length),
            })}
          </p>
          {actions(chosen, clear)}
          <button className="link text-sm" onClick={clear} type="button">
            {t("clear")}
          </button>
        </div>
      ) : null}
      <DataTable
        caption={caption}
        columns={[boxColumn, ...columns]}
        empty={empty}
        rowKey={rowKey}
        rows={rows}
      />
    </div>
  );
};
