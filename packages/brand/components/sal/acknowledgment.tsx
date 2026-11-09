import { cn } from "../../lib/utils";

/**
 * The two acknowledgment lines (decisions §2), fixed in both languages
 * (claude/glossary_ar.md):
 *
 * - "With the support of" («بمساندة»): AUIB's own offices (AUIB, the Office
 *   of Student Life, AUIB Press, the Library, the colleges), on the partners
 *   page only, from the site's code. They are not partners.
 * - "Supported by" («بدعم من»): a sponsor in kind, on the event page, the
 *   partner's listing, printed programs and the thank-you (F-30).
 *
 * Only the names (or logos) follow the line: no qualitative or comparative
 * words, prices or calls to buy (the IRS line between an acknowledgment and
 * advertising), so the components take names and logos, never a sentence.
 */
export const ACKNOWLEDGMENT_LINES = {
  sponsor: { ar: "بدعم من", en: "Supported by" },
  support: { ar: "بمساندة", en: "With the support of" },
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
      const mark = item.logo ? (
        <>
          {/* biome-ignore lint/performance/noImgElement: a supplied logo file */}
          <img
            alt={item.name}
            className={cn("h-12 w-auto", item.logo.onInk && "on-ink:hidden")}
            height={item.logo.height}
            src={item.logo.src}
            width={item.logo.width}
          />
          {item.logo.onInk ? (
            /* biome-ignore lint/performance/noImgElement: a supplied logo file */
            <img
              alt={item.name}
              className="on-ink:block hidden h-12 w-auto"
              height={item.logo.height}
              src={item.logo.onInk}
              width={item.logo.width}
            />
          ) : null}
        </>
      ) : (
        <span className={compact ? undefined : "type-body"}>{item.name}</span>
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

/** "With the support of" and AUIB's own offices: About and the footer. */
export const WithTheSupportOf = (props: AcknowledgmentProps) => (
  <Line {...props} kind="support" />
);

/** "Supported by" and a sponsor in kind: the names or logos alone. */
export const SupportedBy = (props: AcknowledgmentProps) => (
  <Line {...props} kind="sponsor" />
);
