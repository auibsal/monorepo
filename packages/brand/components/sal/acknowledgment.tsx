import { cn } from "../../lib/utils";

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
 * logos, never a sentence. Every logo is the same size, and its name is
 * always written beside it.
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
   * Its logo for paper, and for ink if it has one (AUIB's standard set),
   * with the file's own width and height (shown 48 px high).
   */
  readonly logo?: {
    readonly height: number;
    readonly onInk?: string;
    readonly src: string;
    readonly width: number;
  } | null;
  /** Its name in the line's language, exactly as on its own materials. */
  readonly name: string;
}

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
      const mark = (
        <span className="inline-flex items-center gap-3">
          {item.logo ? (
            <>
              {/* biome-ignore lint/performance/noImgElement: a supplied logo file */}
              <img
                alt=""
                className={cn(
                  "h-12 w-auto max-w-40 object-contain",
                  item.logo.onInk && "on-ink:hidden"
                )}
                height={item.logo.height}
                src={item.logo.src}
                width={item.logo.width}
              />
              {item.logo.onInk ? (
                /* biome-ignore lint/performance/noImgElement: a supplied logo file */
                <img
                  alt=""
                  className="on-ink:block hidden h-12 w-auto max-w-40 object-contain"
                  height={item.logo.height}
                  src={item.logo.onInk}
                  width={item.logo.width}
                />
              ) : null}
            </>
          ) : null}
          <span className={compact ? undefined : "type-body"}>{item.name}</span>
        </span>
      );
      return (
        <li key={item.name} lang={lang}>
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
    <section
      className={cn("grid gap-3", className)}
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
