import type { ReactNode } from "react";

/** A titled block of the page. */
export const Block = ({
  children,
  id,
  title,
}: {
  readonly children: ReactNode;
  readonly id: string;
  readonly title: string;
}) => (
  <section aria-labelledby={id} className="grid gap-4">
    <h2 className="type-heading border-line border-b pb-2" id={id}>
      {title}
    </h2>
    {children}
  </section>
);

/** Code the reader copies: a path, a header, a request. */
export const Code = ({ children }: { readonly children: ReactNode }) => (
  <code
    className="rounded border-line border-t px-1.5 py-0.5 font-mono text-sm"
    dir="ltr"
  >
    {children}
  </code>
);
