import { localized } from "@repo/sal-data";

export interface CouncilSeat {
  covered_by: string | null;
  holder_ar: string | null;
  holder_en: string | null;
  key: string;
  kind: string;
  title_ar: string;
  title_en: string;
  [field: string]: unknown;
}

interface CouncilSeatsProps {
  /** "Covered by the President", given the covering seat's title. */
  readonly covered: (title: string) => string;
  readonly locale: string;
  /** Shown when a seat has neither holder nor cover. */
  readonly open: string;
  readonly seats: readonly CouncilSeat[];
}

/**
 * The Council (owner, Oct 30, 2026): every seat by its full title, with
 * its holder or the officer who covers it. A name without its Arabic
 * spelling yet keeps the English one, marked as English.
 */
export const CouncilSeats = ({
  covered,
  locale,
  open,
  seats,
}: CouncilSeatsProps) => {
  const byKey = new Map(seats.map((seat) => [seat.key, seat]));
  const holder = (seat: CouncilSeat) => {
    if (seat.holder_en) {
      const english = locale === "ar" && !seat.holder_ar;
      return (
        <p className="type-subheading" lang={english ? "en" : undefined}>
          {english ? seat.holder_en : localized(seat, "holder", locale)}
        </p>
      );
    }
    const cover = seat.covered_by ? byKey.get(seat.covered_by) : undefined;
    const line = cover ? covered(localized(cover, "title", locale)) : open;
    return <p className="type-body text-text-secondary">{line}</p>;
  };

  return (
    <ul className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
      {seats.map((seat) => (
        <li
          className="grid content-start gap-1 border-line border-t py-space-4"
          key={seat.key}
        >
          <p className="type-label">{localized(seat, "title", locale)}</p>
          {holder(seat)}
        </li>
      ))}
    </ul>
  );
};
