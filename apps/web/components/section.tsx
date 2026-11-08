import { SectionHead } from "@repo/brand/components/sal/section-head";
import type { ReactNode } from "react";

/**
 * A page section: the title alone in 44 px Light, an
 * optional text link at the end, then the content after a title's space.
 */
export const Section = ({
  action,
  children,
  id,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  id: string;
  title: string;
}) => (
  <section aria-labelledby={id} className="gap-space-5 grid">
    <SectionHead action={action} title={title} titleId={id} />
    {children}
  </section>
);

/** A page header: a Light display title in ink and one sentence. */
export const PageHeader = ({
  children,
  lede,
  title,
}: {
  children?: ReactNode;
  lede: string;
  title: ReactNode;
}) => (
  <header className="grid gap-6">
    <h1 className="type-display max-w-4xl text-balance">{title}</h1>
    <p className="type-lede text-text-secondary max-w-[34ch]">{lede}</p>
    {children}
  </header>
);

/**
 * Pillars, steps and facts: a list on hairlines, a Regular title and a
 * line of text in each, in one to three columns. Never boxes.
 */
export const RuledList = ({
  columns = 2,
  items,
  level: Heading = "h3",
  numbered = false,
}: {
  columns?: 1 | 2 | 3;
  level?: "h2" | "h3";
  items: readonly { body: ReactNode; key: string; title: ReactNode }[];
  numbered?: boolean;
}) => {
  const grid = {
    1: "",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
  }[columns];
  const List = numbered ? "ol" : "ul";
  return (
    <List className={`grid gap-x-10 ${grid}`}>
      {items.map((item, index) => (
        <li
          className="border-line py-space-4 grid content-start gap-2 border-t"
          key={item.key}
        >
          <Heading className="type-heading">
            {numbered ? (
              <span className="text-text-secondary me-3 font-light">
                {String(index + 1).padStart(2, "0")}
              </span>
            ) : null}
            {item.title}
          </Heading>
          <div className="type-body text-text-secondary max-w-[52ch]">
            {item.body}
          </div>
        </li>
      ))}
    </List>
  );
};
