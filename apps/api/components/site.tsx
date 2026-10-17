import { project } from "@repo/config";
import { BrandLogo } from "@repo/design-system/components/brand-logo";
import Link from "next/link";
import type { ReactNode } from "react";

const sections = [
  { href: "/", label: "Overview" },
  { href: "/guide", label: "Guide" },
  { href: "/reference", label: "Reference" },
] as const;

/** api.auibsal.org's frame: the Society's mark, the three sections, links out. */
export const Site = ({ children }: { readonly children: ReactNode }) => (
  <div className="flex min-h-dvh flex-col">
    <a
      className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:bg-surface focus:p-2"
      href="#main"
    >
      Skip to content
    </a>
    <header className="frame-b bg-surface">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <a className="shrink-0" href={project.url}>
          <BrandLogo height={48} locale="en" />
          <span className="sr-only">{project.name}</span>
        </a>
        <nav aria-label="API" className="ms-auto">
          <ul className="flex gap-6">
            {sections.map((s) => (
              <li key={s.href}>
                <Link
                  className="type-label block border-transparent border-b-2 py-1 text-xs hover:border-frame"
                  href={s.href}
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12" id="main">
      {children}
    </main>
    <footer className="frame-t">
      <ul className="type-caption mx-auto flex w-full max-w-5xl flex-wrap gap-x-6 gap-y-2 px-4 py-4">
        <li>
          <a className="hover:underline" href={project.url}>
            auibsal.org
          </a>
        </li>
        <li>
          <a
            className="hover:underline"
            href={`${project.url}/documents/api-terms`}
          >
            API terms
          </a>
        </li>
        <li>
          <a
            className="hover:underline"
            href={`${project.url}/documents/security`}
          >
            Security
          </a>
        </li>
        <li>
          <a className="hover:underline" href="/health">
            Status
          </a>
        </li>
        <li>
          <a
            className="hover:underline"
            href={`mailto:${project.supportEmail}`}
          >
            {project.supportEmail}
          </a>
        </li>
      </ul>
    </footer>
  </div>
);

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
    <h2 className="type-heading border-accent-line border-b pb-2" id={id}>
      {title}
    </h2>
    {children}
  </section>
);

/** Code the reader copies: a path, a header, a request. */
export const Code = ({ children }: { readonly children: ReactNode }) => (
  <code
    className="rounded bg-surface-tint px-1.5 py-0.5 font-mono text-sm"
    dir="ltr"
  >
    {children}
  </code>
);
