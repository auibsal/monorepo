import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/section";
import { type TeamGroup, TeamList } from "@/components/team-list";
import { governance } from "@/lib/data";
import { type LocaleParams, sectionMetadata } from "@/lib/page";
import { readPublished } from "@/lib/supabase";

export const generateMetadata = sectionMetadata("web.people", "/about/people");

/** The seats with a department, in the Council's order (decisions §4). */
const DEPARTMENTS = [
  "eic",
  "media_director",
  "events_director",
  "partnerships_director",
  "membership_director",
] as const;

/**
 * Our people (decisions.md, The Council and the roles: "How teams are
 * shown"): each department under its seat, the seat's holder first. The
 * web team is credited here, under Media (decisions.md, The site:
 * Credits).
 */
const PeoplePage = async ({ params }: LocaleParams) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.people" });
  const tg = await getTranslations({ locale, namespace: "web.governance" });
  const ar = locale === "ar";
  const [seats, people] = await Promise.all([
    readPublished(["governance"], (c) => governance.councilSeats(c), []),
    readPublished(["governance"], (c) => governance.societyPeople(c), []),
  ]);
  const groups: TeamGroup[] = DEPARTMENTS.map((key) => {
    const seat = seats.find((s) => s.seat === key);
    const holders = (ar ? seat?.holders_ar : seat?.holders_en) ?? [];
    const title = seat?.feminine
      ? tg(`seatsFeminine.${key}`)
      : tg(`seats.${key}`);
    return {
      heading: t(`departments.${key}`),
      key,
      members: [
        {
          key,
          name: holders.length > 0 ? holders.join(ar ? "، " : ", ") : null,
          title,
        },
        ...people
          .filter((p) => p.seat === key)
          .map((p) => ({
            key: `${p.role}-${p.name_en}`,
            name: (ar ? p.name_ar : p.name_en) ?? p.name_en,
            title: (ar ? p.title_ar : p.title_en) ?? p.title_en,
          })),
      ],
    };
  });
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:py-24">
      <PageHeader lede={t("lede")} title={t("title")} />
      <TeamList groups={groups} open={tg("seatOpen")} />
    </div>
  );
};

export default PeoplePage;
