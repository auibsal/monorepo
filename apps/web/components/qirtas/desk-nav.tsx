"use client";

import { Link, usePathname } from "@repo/internationalization/navigation";

const DESK_LINK =
  "whitespace-nowrap border-transparent border-b-[1.5px] py-1 font-medium text-[0.90625rem] hover:text-accent aria-[current=page]:border-accent";

/** Where a Qirtas address belongs among the sections. */
const sectionOf = (path: string, desks: readonly string[]) => {
  const [, first, second] = path.split("/");
  if (first !== "qirtas" || !second) {
    return null;
  }
  return desks.includes(second) ? second : null;
};

/**
 * The sections under the nameplate. The nameplate stays put from page to
 * page (it is the layout's), so the section being read is marked here,
 * from the address.
 */
export const DeskNav = ({
  desks,
  label,
}: {
  readonly desks: readonly { key: string; name: string }[];
  readonly label: string;
}) => {
  const current = sectionOf(
    usePathname(),
    desks.map((d) => d.key)
  );
  return (
    <nav aria-label={label} className="border-line -mx-4 border-b px-4 pb-3">
      <ul className="flex flex-wrap justify-center gap-x-8 gap-y-2">
        {desks.map((d) => (
          <li key={d.key}>
            <Link
              aria-current={current === d.key ? "page" : undefined}
              className={DESK_LINK}
              href={`/qirtas/${d.key}`}
            >
              {d.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};
