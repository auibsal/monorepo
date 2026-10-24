import type { ReactNode } from "react";
import { logos } from "../../brand/logos";
import { cn } from "../../lib/utils";

export type SocialPostGround = "crimson" | "ink" | "white";

interface SocialPostProps {
  readonly className?: string;
  /** The date (and place) line, e.g. "Tuesday, October 13". */
  readonly date: string;
  /**
   * Choose by purpose: crimson for calls and moments, white for events, ink
   * for words worth keeping and recruiting.
   */
  readonly ground: SocialPostGround;
  /** The account handle; the brand puts @auibsal on every post. */
  readonly handle?: string;
  /**
   * Two or three words with a full stop, in Light. Wrap one word at most in
   * <i> for the italic: "Edition 1 is <i>open.</i>" No exclamation marks.
   */
  readonly headline: ReactNode;
  /**
   * One language per post: "ar" mirrors the post and uses the Arabic lockup
   * and Ubuntu Arabic (Regular; the <i> word changes color only).
   */
  readonly lang?: "ar" | "en";
  /** One sentence under the headline. */
  readonly lede?: string;
}

const grounds: Record<
  SocialPostGround,
  { dark: boolean; frame: string; italic: string; meta: string }
> = {
  crimson: {
    dark: true,
    frame: "bg-[var(--sal-crimson)] text-[var(--sal-white)]",
    italic: "",
    meta: "text-[var(--sal-crimson-100)]",
  },
  ink: {
    dark: true,
    frame: "bg-[var(--sal-ink)] text-[var(--sal-white)]",
    italic: "[&_i]:text-[var(--sal-crimson-100)]",
    meta: "text-[var(--sal-crimson-100)]",
  },
  white: {
    dark: false,
    frame: "bg-[var(--sal-white)] text-[var(--sal-ink)]",
    italic: "[&_i]:text-[var(--sal-crimson)]",
    meta: "",
  },
};

/** Units of 1/1080 of the post's width, as in the brand's bundle.css. */
const u = (n: number) => `calc(${n} * 100cqw / 1080)`;

/**
 * The brand's Social Post (brand/components/previews/SocialPost.md): 1080 ×
 * 1350 at any width, in one language. The lockup in the post's language at
 * the top start; a headline (Light in English, Regular in Arabic) with one
 * accent word at most and nothing above it; one sentence; the date and
 * @auibsal at the bottom start.
 */
export const SocialPost = ({
  className,
  date,
  ground,
  handle = "@auibsal",
  headline,
  lang = "en",
  lede,
}: SocialPostProps) => {
  const style = grounds[ground];
  const arabic = lang === "ar";
  const lockup = arabic ? logos["horizontal-ar"] : logos.horizontal;
  return (
    <div
      className={cn("@container w-full", arabic && "font-arabic", className)}
      dir={arabic ? "rtl" : "ltr"}
      lang={lang}
    >
      <div
        className={cn(
          "relative aspect-[4/5] w-full overflow-hidden font-sans",
          style.frame
        )}
      >
        {/* biome-ignore lint/performance/noImgElement: SVG lockup, served as supplied */}
        <img
          alt="AUIB Society of Arts and Letters"
          className="absolute w-auto"
          height={132}
          src={style.dark ? lockup.onDark : lockup.onLight}
          style={{ height: u(132), insetInlineStart: u(80), top: u(72) }}
          width={Math.round(132 * lockup.aspect)}
        />
        <h2
          className={cn(
            "absolute m-0",
            arabic
              ? "font-normal leading-[1.3] [&_i]:not-italic"
              : "font-light leading-none tracking-[-0.03em] [&_i]:font-light",
            style.italic
          )}
          style={{
            fontSize: u(arabic ? 132 : 160),
            insetInline: u(80),
            top: u(330),
          }}
        >
          {headline}
        </h2>
        {lede ? (
          <p
            className={cn(
              "absolute m-0 max-w-[24ch]",
              arabic ? "leading-[1.7]" : "leading-[1.4]"
            )}
            style={{
              fontSize: u(arabic ? 42 : 38),
              insetInlineStart: u(80),
              top: u(760),
            }}
          >
            {lede}
          </p>
        ) : null}
        <p
          className={cn(
            "absolute m-0",
            arabic ? "leading-[1.7]" : "font-medium leading-[1.4]",
            style.meta
          )}
          style={{
            bottom: u(72),
            fontSize: u(arabic ? 30 : 28),
            insetInlineStart: u(80),
          }}
        >
          <span className="block">{date}</span>
          <bdi className="block" dir="ltr">
            {handle}
          </bdi>
        </p>
      </div>
    </div>
  );
};
