"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import { Link } from "@repo/internationalization/navigation";
import { journal, localized } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ErrorLine } from "../admin/kit";
import { DiwanSection, RowList } from "../page";

type Lang = "en" | "ar";

/**
 * The members' vote for the Mutanabbi Prize (owner, Nov 7, 2026): while a
 * round's vote is open, each voting member picks one work in each
 * category, once. Qalam students' names are hidden. The vote is 30% of
 * the final score; the outside judge's is 70%.
 */
export const PrizeVote = () => {
  const t = useTranslations("diwan.society.prize");
  const locale = useLocale() as Lang;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const round = useQuery({
    queryFn: () => journal.openPrizeRound(supabase),
    queryKey: ["prize-vote", "round"],
  });
  const ballot = useQuery({
    enabled: Boolean(round.data),
    // Only voting members get a ballot; anyone else sees nothing.
    queryFn: () =>
      journal.prizeBallot(supabase, round.data as string).catch(() => null),
    queryKey: ["prize-vote", "ballot", round.data],
  });
  const vote = useMutation({
    mutationFn: (entryId: string) => journal.castPrizeVote(supabase, entryId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["prize-vote"] }),
  });
  if (!(round.data && ballot.data && ballot.data.length > 0)) {
    return null;
  }
  return (
    <DiwanSection description={t("lede")} id="prize" title={t("title")}>
      {journal.PRIZE_CATEGORIES.map((category) => {
        const works = ballot.data?.filter((w) => w.category === category) ?? [];
        if (works.length === 0) {
          return null;
        }
        const voted = works.some((w) => w.voted);
        return (
          <div className="grid gap-2" key={category}>
            <h3 className="type-subheading">{t(`categories.${category}`)}</h3>
            {voted ? <p className="type-body">{t("voted")}</p> : null}
            <RowList>
              {works.map((w) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 py-3"
                  key={w.entry_id}
                >
                  <span className="grid gap-0.5">
                    {w.piece_slug && w.desk ? (
                      <Link
                        className="link"
                        href={journal.piecePath({
                          desk: w.desk,
                          slug: w.piece_slug,
                        })}
                      >
                        {localized(w, "title", locale)}
                      </Link>
                    ) : (
                      <span>{localized(w, "title", locale)}</span>
                    )}
                    {localized(w, "byline", locale) ? (
                      <span className="type-caption">
                        {localized(w, "byline", locale)}
                      </span>
                    ) : null}
                  </span>
                  {voted ? null : (
                    <Button
                      disabled={vote.isPending}
                      onClick={() => vote.mutate(w.entry_id)}
                      size="sm"
                      variant="outline"
                    >
                      {t("vote")}
                    </Button>
                  )}
                </li>
              ))}
            </RowList>
          </div>
        );
      })}
      <ErrorLine error={vote.error} />
    </DiwanSection>
  );
};
