import { logoScale } from "../../lib/logo-scale";
import { cn, dirOf } from "../../lib/utils";

/**
 * Who it's with (decisions.md, Partners; Events), fixed in both languages
 * (claude/glossary_ar.md), every organization from the one register:
 *
 * - "Co-sponsored by" («برعاية مشتركة مع»): the partners and campus
 *   partners an event is run with, at the foot of its page.
 * - "Thanks to" («شكر وتقدير»): the sponsors in kind, on the event page, the
 *   listing, printed programs and the thank-you.
 * - "Campus partners" («شركاء من الجامعة»): AUIB's own offices, on the
 *   partners page after the partners.
 *
 * Only the names (with their logos) follow the line: no qualitative or
 * comparative words, prices or calls to buy (the IRS line between an
 * acknowledgment and advertising), so the components take names and
 * logos, never a sentence. Every logo fits one box, scaled so wide and
 * tall logos look equally heavy, or in a row one height, 40 px, its width
 * following, never cropped, padded or fitted to a square, and never wider
 * than the row (decisions.md, The site). In dark mode a row sits on one
 * white band across its section, every logo in its own colors and the label
 * in ash; light mode is unchanged. A logo that shows the name stands
 * alone, the name its alt text and link label (WCAG 1.1.1, 2.4.4); a
 * symbol-only logo, or none, has the name in text beside it. A logo is
 * shown as the organization made it in both languages; only the alt text
 * and the label follow the page.
 */
const ACKNOWLEDGMENT_LINES = {
  campus: { ar: "شركاء من الجامعة", en: "Campus partners" },
  cosponsor: { ar: "برعاية مشتركة مع", en: "Co-sponsored by" },
  thanks: { ar: "شكر وتقدير", en: "Thanks to" },
} as const;

export interface Acknowledged {
  /** Where the name links, if anywhere: the organization's own site. */
  readonly href?: string | null;
  /**
   * Its logo, with the file's own width and height (fitted to its box or
   * row by OrganizationLogo). One version only: in dark mode it stands on
   * a white band, in its own colors.
   */
  readonly logo?: {
    readonly height: number;
    readonly src: string;
    readonly width: number;
  } | null;
  /** The logo's own alt text, when it says more than the name. */
  readonly logoAlt?: string | null;
  /** Its name in the line's language, exactly as on its own materials. */
  readonly name: string;
  /**
   * "The logo shows the name": the logo stands alone, the name its alt
   * text; otherwise the name is written beside it.
   */
  readonly showsName?: boolean;
}

/**
 * One organization's logo, in its own colors. `alt` is its name (or its own
 * alt text) when the logo shows the name. `size` "box" fits every logo to
 * one box, 64 px tall on phones and 80 px on computers, scaled for equal
 * weight (the partners page and the Diwan's register), on a white band
 * across its card in dark mode; "row" is a row's one height, 40 px, the
 * width following and never wider than the row.
 */
export const OrganizationLogo = ({
  alt = "",
  className,
  logo,
  size = "box",
}: {
  readonly alt?: string;
  readonly className?: string;
  readonly logo: NonNullable<Acknowledged["logo"]>;
  readonly size?: "box" | "row";
}) => {
  const box = size === "box";
  const style = box
    ? {
        height: `calc(var(--logo-box) * ${logoScale(logo.width, logo.height).toFixed(3)})`,
      }
    : undefined;
  const imageClass = box
    ? "w-auto max-w-full object-contain"
    : "h-auto max-h-10 w-auto max-w-full";
  const image = (
    // biome-ignore lint/performance/noImgElement: a supplied logo file
    <img
      alt={alt}
      className={imageClass}
      height={logo.height}
      src={logo.src}
      style={style}
      width={logo.width}
    />
  );
  if (!box) {
    return (
      <span className={cn("inline-flex max-w-full", className)}>{image}</span>
    );
  }
  // A card's logo: in dark mode on a white band across the card.
  return (
    <span
      className={cn(
        "flex max-w-full",
        className,
        "dark:bg-surface dark:justify-self-stretch dark:px-4 dark:py-3"
      )}
      data-theme="light"
    >
      <span className="inline-flex h-16 max-w-full items-center [--logo-box:4rem] lg:h-20 lg:[--logo-box:5rem]">
        {image}
      </span>
    </span>
  );
};

interface AcknowledgmentProps {
  readonly className?: string;
  /** Names at the surrounding text's size, closer together (a footer). */
  readonly compact?: boolean;
  /** The reading direction; Arabic reads right to left. */
  readonly dir?: "ltr" | "rtl";
  readonly items: readonly Acknowledged[];
  /**
   * The line in the page's language, from its messages; the English and
   * Arabic lines above when not given.
   */
  readonly label?: string;
  readonly lang?: string;
}

const Names = ({
  compact = false,
  items,
  lang,
}: {
  compact?: boolean;
  items: readonly Acknowledged[];
  lang: string;
}) => (
  <ul
    className={cn(
      "flex flex-wrap items-center",
      compact ? "gap-x-4 gap-y-1" : "gap-x-8 gap-y-4"
    )}
  >
    {items.map((item) => {
      const alone = Boolean(item.logo && item.showsName !== false);
      const mark = (
        <span className="inline-flex max-w-full items-center gap-3">
          {item.logo ? (
            <OrganizationLogo
              alt={alone ? (item.logoAlt ?? item.name) : ""}
              logo={item.logo}
              size="row"
            />
          ) : null}
          {alone ? null : (
            <span className={compact ? undefined : "type-body"}>
              {item.name}
            </span>
          )}
        </span>
      );
      return (
        <li
          className="max-w-full"
          dir={dirOf(lang)}
          key={item.name}
          lang={lang}
        >
          {item.href ? (
            <a
              className="hover:underline"
              href={item.href}
              rel="noopener"
              target="_blank"
            >
              {mark}
            </a>
          ) : (
            mark
          )}
        </li>
      );
    })}
  </ul>
);

const Line = ({
  className,
  compact,
  dir,
  items,
  kind,
  label,
  lang = "en",
}: AcknowledgmentProps & { kind: keyof typeof ACKNOWLEDGMENT_LINES }) =>
  items.length === 0 ? null : (
    // In dark mode, one white band across the section (into the page's
    // gutter, the logos still in line with the text): every logo in its own
    // colors, the label in ash. A light sheet, as paper is; light mode is
    // unchanged.
    <section
      className={cn(
        "grid gap-3",
        className,
        "dark:bg-surface dark:-mx-4 dark:px-4 dark:py-4"
      )}
      data-theme="light"
      dir={dir ?? (lang === "ar" ? "rtl" : "ltr")}
      lang={lang}
    >
      <p className="type-label">
        {label ?? ACKNOWLEDGMENT_LINES[kind][lang === "ar" ? "ar" : "en"]}
      </p>
      <Names compact={compact} items={items} lang={lang} />
    </section>
  );

/** "Co-sponsored by": the partners and campus partners an event is run with. */
export const CoSponsoredBy = (props: AcknowledgmentProps) => (
  <Line {...props} kind="cosponsor" />
);

/** "Thanks to": the sponsors in kind, their names (and logos) alone. */
export const ThanksTo = (props: AcknowledgmentProps) => (
  <Line {...props} kind="thanks" />
);

/** "Campus partners": AUIB's own offices, on the partners page. */
export const CampusPartners = (props: AcknowledgmentProps) => (
  <Line {...props} kind="campus" />
);
