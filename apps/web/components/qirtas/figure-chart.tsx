"use client";

import { useState } from "react";

export interface ChartRow {
  readonly label: string;
  /** The value as written for the page's language (Latin digits). */
  readonly shown: string;
  readonly value: number;
}

/**
 * A figure in an explainer (the design review A16): one series of labeled
 * values as horizontal bars, from zero, in ink; the bar under the pointer
 * or focus turns crimson and says its value. Square ends and hairlines, as
 * the brand book asks. The same values as a table, one press away.
 */
export const FigureChart = ({
  asBars,
  asTable,
  rows,
  title,
  unit,
  valueHeader,
}: {
  readonly asBars: string;
  readonly asTable: string;
  readonly rows: readonly ChartRow[];
  readonly title: string;
  readonly unit: string;
  readonly valueHeader: string;
}) => {
  const [table, setTable] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  // Bars start at zero; a figure with a value below zero is shown as a table.
  const drawable = rows.every((r) => r.value >= 0);
  const max = Math.max(...rows.map((r) => r.value), 0);
  const withUnit = (row: ChartRow) =>
    unit ? `${row.shown} ${unit}` : row.shown;

  const valueLabel = unit.length > 0 ? `${valueHeader} (${unit})` : valueHeader;

  if (table || !drawable) {
    return (
      <div className="grid gap-3">
        <table className="w-full border-collapse font-sans text-sm">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr className="border-text border-b">
              <th className="py-2 text-start font-medium" scope="col">
                {title}
              </th>
              <th className="py-2 text-end font-medium" scope="col">
                {valueLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-line border-b" key={row.label}>
                <th className="py-2 text-start font-normal" scope="row">
                  {row.label}
                </th>
                <td className="py-2 text-end tabular-nums">{row.shown}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {drawable ? (
          <button
            className="link justify-self-start text-sm"
            onClick={() => setTable(false)}
            type="button"
          >
            {asBars}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-3 font-sans">
      <ul aria-label={title} className="grid gap-[2px]">
        {rows.map((row, index) => {
          const on = active === index;
          return (
            <li key={row.label}>
              <button
                aria-label={`${row.label}: ${withUnit(row)}`}
                className="grid w-full grid-cols-[minmax(6rem,10rem)_1fr] items-center gap-3 text-start outline-none focus-visible:ring-2 focus-visible:ring-accent"
                onBlur={() => setActive(null)}
                onFocus={() => setActive(index)}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
                type="button"
              >
                <span className="truncate text-sm">{row.label}</span>
                <span className="relative flex h-6 items-center">
                  <span
                    className={`block h-full transition-colors duration-quick ease-standard ${
                      on ? "bg-accent" : "bg-text"
                    }`}
                    // Room is kept at the end for the value beside the longest bar.
                    style={{
                      width: `calc((100% - 7rem) * ${max > 0 ? Math.max(row.value / max, 0.005) : 0.005})`,
                    }}
                  />
                  {on ? (
                    <span className="ms-2 whitespace-nowrap text-sm tabular-nums">
                      {withUnit(row)}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <button
        className="link justify-self-start text-sm"
        onClick={() => setTable(true)}
        type="button"
      >
        {asTable}
      </button>
    </div>
  );
};
