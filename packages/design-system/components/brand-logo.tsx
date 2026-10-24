import { project } from "@repo/config";
import { type LogoVariant, logos } from "../brand/logos";
import { cn } from "../lib/utils";

const HEIGHT_CLASS = /(^|\s)([\w-]+:)?h-/;

interface BrandLogoProps {
  readonly className?: string;
  /**
   * The ground the logo sits on. "auto" (the default) follows the theme:
   * the reversed file on ink (dark mode, or an ink block), the standard
   * file elsewhere. "light" or "dark" fixes one file.
   */
  readonly ground?: "auto" | "light" | "dark";
  /** Rendered height in pixels (the width follows the file's proportions). */
  readonly height?: number;
  readonly locale?: string;
  readonly variant?: LogoVariant;
}

/**
 * The SAL logo from brand/logos, exactly as supplied: an <img> of the SVG,
 * never redrawn. The alt text is the Society's name in the page language.
 */
export const BrandLogo = ({
  className,
  ground = "auto",
  height = 40,
  locale = "en",
  variant = "horizontal",
}: BrandLogoProps) => {
  // One language per page: the horizontal lockup comes in the page's
  // language (the Arabic lockup on /ar).
  const file =
    variant === "horizontal" && locale === "ar"
      ? logos["horizontal-ar"]
      : logos[variant];
  // A height class (h-10 lg:h-14) sizes the logo responsively; otherwise the
  // inline height does (Tailwind's preflight sets images to height: auto).
  const sized = HEIGHT_CLASS.test(className ?? "");
  const name = locale === "ar" ? project.nameAr : project.name;
  // Both images carry the name: the one CSS hides (display: none) is left
  // out of the accessibility tree, so a link around the logo always has one.
  const image = (src: string, extra?: string) => (
    // biome-ignore lint/performance/noImgElement: SVG logo, served as supplied
    <img
      alt={name}
      className={cn("block w-auto", extra, className)}
      height={height}
      src={src}
      style={sized ? undefined : { height }}
      width={Math.round(height * file.aspect)}
    />
  );

  if (ground !== "auto") {
    return image(ground === "dark" ? file.onDark : file.onLight);
  }
  // Both files, one shown: the theme is known only in the browser, so CSS
  // picks the file and the page renders the same for everyone.
  return (
    <>
      {image(file.onLight, "on-ink:hidden")}
      {image(file.onDark, "on-ink:block hidden")}
    </>
  );
};
