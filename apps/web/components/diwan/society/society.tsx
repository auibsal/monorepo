"use client";

import { Button } from "@repo/brand/components/ui/button";
import { localizedPath } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { type governance, localized, membership, unwrap } from "@/lib/data";
import { StartLinks } from "../forms/forms";
import { VotingEligibility } from "../home/voting";
import { DiwanPage, DiwanSection, RowList } from "../page";
import { EmptyLine, ErrorState, SectionSpinner } from "../states";
import { Elections } from "./elections";
import { PrizeVote } from "./prize-vote";
import { SocietySection } from "./section";

type Lang = "en" | "ar";

const Minutes = () => {
  const t = useTranslations("diwan.society.minutes");
  const tb = useTranslations("diwan.admin.governance.bodies");
  const ta = useTranslations("diwan.next");
  const locale = useLocale() as Lang;
  const { supabase } = useAuth();
  const minutes = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("minutes")
          .select(
            "id, body, meeting_on, adopted_on, title_en, title_ar, text_en, text_ar"
          )
          .eq("status", "approved")
          .order("meeting_on", { ascending: false })
          .limit(30)
      ) ?? [],
    queryKey: ["adopted-minutes"],
  });

  return (
    <SocietySection id="minutes" lede={t("lede")} title={t("title")}>
      {minutes.isPending ? <SectionSpinner /> : null}
      {minutes.isError ? (
        <ErrorState onRetry={() => minutes.refetch()} />
      ) : null}
      {minutes.data?.length === 0 ? (
        <EmptyLine
          action={{
            href: `${localizedPath(locale, "/library")}`,
            label: ta("readDocuments"),
          }}
        >
          {t("empty")}
        </EmptyLine>
      ) : null}
      <RowList>
        {minutes.data?.map((entry) => (
          <li key={entry.id}>
            <details>
              <summary className="cursor-pointer">
                <span className="type-subheading">
                  {localized(entry, "title", locale)}
                </span>{" "}
                <span className="type-caption">
                  {tb(entry.body as governance.MeetingBody)} ·{" "}
                  {formatLongDate(entry.meeting_on, locale)}
                </span>
              </summary>
              <div className="type-body mt-3 whitespace-pre-line">
                {localized(entry, "text", locale)}
              </div>
              {entry.adopted_on ? (
                <p className="type-caption mt-2">
                  {t("adoptedOn", {
                    date: formatLongDate(entry.adopted_on, locale),
                  })}
                </p>
              ) : null}
            </details>
          </li>
        ))}
      </RowList>
    </SocietySection>
  );
};

/**
 * The members directory (decisions.md): members only, and only those
 * who chose to be listed; the Register itself is private. A member joins or
 * leaves it here.
 */
const MembersDirectory = () => {
  const t = useTranslations("diwan.society.book");
  const locale = useLocale() as Lang;
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const book = useQuery({
    queryFn: () => membership.membersDirectory(supabase),
    queryKey: ["members-directory"],
  });
  const listed = book.data?.some((p) => p.user_id === user?.id) ?? false;
  const toggle = useMutation({
    mutationFn: () =>
      membership.setInDirectory(supabase, user?.id ?? "", !listed),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["members-directory"] }),
  });

  return (
    <SocietySection
      id="book"
      lede={
        book.data
          ? t("lede", { count: book.data.length, members: book.data.length })
          : undefined
      }
      title={t("title")}
    >
      {book.isPending ? <SectionSpinner /> : null}
      {book.isError ? <ErrorState onRetry={() => book.refetch()} /> : null}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <p className="type-body text-text-secondary">
          {listed ? t("listed") : t("notListed")}
        </p>
        <Button
          disabled={toggle.isPending || book.isPending}
          onClick={() => toggle.mutate()}
          size="sm"
          type="button"
          variant="ghost"
        >
          {listed ? t("leave") : t("join")}
        </Button>
      </div>
      <ul className="grid gap-x-8 sm:grid-cols-2">
        {book.data?.map((person) => (
          <li className="border-line border-t py-3" key={person.user_id}>
            <p className="type-subheading">
              {(locale === "ar" && person.full_name_ar) || person.full_name_en}
            </p>
          </li>
        ))}
      </ul>
    </SocietySection>
  );
};

/**
 * The Elections tab (/account/elections, decisions §6): your vote, the
 * elections open now and standing for office, the Prize vote, ways to
 * take part, the minutes and the members' directory. The Council itself
 * is the public /about/council.
 */
export const Society = () => {
  const t = useTranslations("diwan.society");
  return (
    <DiwanPage lede={t("lede")} title={t("title")}>
      <VotingEligibility />
      <Elections />
      <PrizeVote />
      <DiwanSection
        description={t("takePart.lede")}
        id="take-part"
        title={t("takePart.title")}
      >
        <StartLinks keys={["f21", "f10"]} />
      </DiwanSection>
      <Minutes />
      <MembersDirectory />
    </DiwanPage>
  );
};
