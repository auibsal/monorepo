import type { ReactNode } from "react";
import { logos } from "../../brand/logos";
import { cn } from "../../lib/utils";

export type SocialPostGround = "crimson" | "ink" | "white";

interface SocialPostProps {
  /** One line of Arabic, bottom end (needs native review if written for us). */
  readonly arabic?: string;
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
 * The brand's Social Post (v6, brand/components/bundle.css): 1080 × 1350 at
 * any width. The horizontal lockup top start; a Light headline with one
 * italic word at most; one sentence; the date and @auibsal bottom start; one
 * line of Arabic bottom end. The layout is the brand's and is not mirrored
 * for Arabic pages.
 */
export const SocialPost = ({
  arabic,
  className,
  date,
  ground,
  handle = "@auibsal",
  headline,
  lede,
}: SocialPostProps) => {
  const style = grounds[ground];
  const lockup = logos.horizontal;
  return (
    <div className={cn("@container w-full", className)} dir="ltr">
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
          style={{ height: u(132), left: u(80), top: u(72) }}
          width={Math.round(132 * lockup.aspect)}
        />
        <h2
          className={cn(
            "absolute m-0 font-light leading-none tracking-[-0.03em] [&_i]:font-light",
            style.italic
          )}
          style={{ fontSize: u(160), left: u(80), right: u(80), top: u(330) }}
        >
          {headline}
        </h2>
        {lede ? (
          <p
            className="absolute m-0 max-w-[24ch] leading-[1.4]"
            style={{ fontSize: u(38), left: u(80), top: u(760) }}
          >
            {lede}
          </p>
        ) : null}
        <p
          className={cn("absolute m-0 font-medium leading-[1.4]", style.meta)}
          style={{ bottom: u(72), fontSize: u(28), left: u(80) }}
        >
          <span className="block">{date}</span>
          <span className="block">{handle}</span>
        </p>
        {arabic ? (
          <p
            className="absolute m-0 font-arabic leading-[1.5]"
            dir="rtl"
            lang="ar"
            style={{ bottom: u(72), fontSize: u(40), right: u(80) }}
          >
            {arabic}
          </p>
        ) : null}
      </div>
    </div>
  );
};
