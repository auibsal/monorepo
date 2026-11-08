/**
 * The Council (decisions.md): each person who holds a Council role,
 * from their own role assignments, named once with every title they hold.
 * A name without its Arabic spelling yet keeps the English one, marked as
 * English.
 */
export interface CouncilSeat {
  /** Every holder chose the feminine Arabic form (decisions §13). */
  feminine?: boolean | null;
  holders_ar: string[] | null;
  holders_en: string[] | null;
  seat: string;
}

/**
 * The Council's seats, each by its full title (`titles`, from the
 * messages; in Arabic, the feminine form where its holder chose it,
 * decisions §13), with whoever holds it or "Open".
 */
export const CouncilSeats = ({
  feminineTitles = {},
  locale,
  open,
  seats,
  titles,
}: {
  /** The seats' titles for a woman holding them, used where she chose it. */
  readonly feminineTitles?: Readonly<Record<string, string>>;
  readonly locale: string;
  readonly open: string;
  readonly seats: readonly CouncilSeat[];
  readonly titles: Readonly<Record<string, string>>;
}) => (
  <ul className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
    {seats.map((seat) => {
      const holders =
        (locale === "ar" ? seat.holders_ar : seat.holders_en) ?? [];
      const named =
        holders.length > 0 ? holders.join(locale === "ar" ? "، " : ", ") : open;
      return (
        <li
          className="grid content-start gap-1 border-line border-t py-space-4"
          key={seat.seat}
        >
          <p className="type-label">
            {(seat.feminine ? feminineTitles[seat.seat] : null) ??
              titles[seat.seat] ??
              seat.seat}
          </p>
          <p
            className={
              holders.length > 0
                ? "type-subheading"
                : "type-subheading text-text-secondary"
            }
          >
            {named}
          </p>
        </li>
      );
    })}
  </ul>
);
