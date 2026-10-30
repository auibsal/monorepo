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
