export interface CouncilMember {
  full_name_ar: string | null;
  full_name_en: string | null;
  titles_ar: string[] | null;
  titles_en: string[] | null;
}

interface CouncilProps {
  readonly locale: string;
  readonly members: readonly CouncilMember[];
}

/**
 * The Council (owner, Oct 30, 2026): each person who holds a Council role,
 * from their own role assignments, named once with every title they hold.
 * A name without its Arabic spelling yet keeps the English one, marked as
 * English.
 */
export interface CouncilSeat {
  holders_ar: string[] | null;
  holders_en: string[] | null;
  seat: string;
}

/**
 * The Council's six seats (owner, Nov 5, 2026): three officers and three
 * directors, each by its full title (`titles`, from the messages), with
 * whoever holds it or "Open".
 */
export const CouncilSeats = ({
  locale,
  open,
  seats,
  titles,
}: {
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
          <p className="type-label">{titles[seat.seat] ?? seat.seat}</p>
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

export const Council = ({ locale, members }: CouncilProps) => (
  <ul className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
    {members.map((member) => {
      const english = locale === "ar" && !member.full_name_ar;
      const name = english ? member.full_name_en : member.full_name_ar;
      const titles =
        (locale === "ar" ? member.titles_ar : member.titles_en) ?? [];
      return (
        <li
          className="grid content-start gap-1 border-line border-t py-space-4"
          key={`${member.full_name_en}-${titles.join()}`}
        >
          <p className="type-label">
            {titles.join(locale === "ar" ? "، " : ", ")}
          </p>
          <p className="type-subheading" lang={english ? "en" : undefined}>
            {locale === "ar" ? name : member.full_name_en}
          </p>
        </li>
      );
    })}
  </ul>
);
