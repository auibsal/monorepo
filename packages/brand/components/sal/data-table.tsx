import { cn } from "@repo/brand/lib/utils";
import type { ReactNode } from "react";

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
  /** What shows when there are no rows, in the page's language. */
  readonly empty: string;
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
  if (rows.length === 0) {
    return <p className="type-body text-text-secondary py-6">{empty}</p>;
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
                  "type-label px-2 py-3 text-start align-bottom whitespace-nowrap",
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
        <tbody className="max-md:border-line max-md:block max-md:border-t">
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
                    "max-md:px-0 max-md:py-0 max-md:text-start max-md:whitespace-normal",
                    index === 0
                      ? "max-md:block max-md:text-base max-md:font-medium"
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
