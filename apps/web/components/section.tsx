import { SectionHead } from "@repo/design-system/components/sal/section-head";
import type { ReactNode } from "react";

/**
 * A page section (v6): the Bookmark and the title in 44 px Regular, an
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
  <section aria-labelledby={id} className="grid gap-space-5">
    <SectionHead action={action} title={title} titleId={id} />
    {children}
  </section>
);

/** A page header (v6): a Light display title in ink and one sentence. */
export const PageHeader = ({
  children,
  kicker,
  lede,
  title,
}: {
  children?: ReactNode;
  kicker?: string;
  lede: string;
  title: ReactNode;
}) => (
  <header className="grid gap-6">
    {kicker ? <p className="type-label">{kicker}</p> : null}
    <h1 className="type-display max-w-4xl text-balance">{title}</h1>
    <p className="type-lede max-w-[34ch] text-text-secondary">{lede}</p>
    {children}
  </header>
);
