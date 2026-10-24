import type { ReactNode } from "react";
import { logos } from "../../brand/logos";
import { cn } from "../../lib/utils";

interface FormHeaderProps {
  readonly children?: ReactNode;
  readonly className?: string;
  /** The form's code in Ubuntu Mono, e.g. "SAL-OPS-02 · F-14". */
  readonly code?: string;
  readonly title: string;
}

/**
 * The brand's Form Header (brand/components/bundle.css `.sal-form`):
 * the form code in Ubuntu Mono and a Light title above an ink hairline, the
 * symbol at the top end. It takes the colors of the page it sits on: on
 * ink, the white symbol (never crimson on ink).
 */
export const FormHeader = ({
  children,
  className,
  code,
  title,
}: FormHeaderProps) => (
  <header className={cn("grid gap-3", className)}>
    <div className="flex items-end justify-between gap-space-4 border-text border-b pb-space-3">
      <div className="grid gap-1.5">
        {code ? (
          <p className="type-code text-sm text-text-secondary">{code}</p>
        ) : null}
        <h1 className="font-light text-[2rem] text-text leading-[1.1] tracking-[-0.02em]">
          {title}
        </h1>
      </div>
      {/* biome-ignore lint/performance/noImgElement: SVG symbol, served as supplied */}
      <img
        alt=""
        className="on-ink:hidden h-11 w-auto flex-none"
        height={44}
        src={logos.symbol.onLight}
        width={Math.round(44 * logos.symbol.aspect)}
      />
      {/* biome-ignore lint/performance/noImgElement: SVG symbol, served as supplied */}
      <img
        alt=""
        className="on-ink:block hidden h-11 w-auto flex-none"
        height={44}
        src={logos.symbol.onDark}
        width={Math.round(44 * logos.symbol.aspect)}
      />
    </div>
    {children ? (
      <div className="type-body text-text-secondary">{children}</div>
    ) : null}
  </header>
);
