"use client";

import { Button } from "@repo/brand/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { localized, unwrap } from "@/lib/data";
import { useRouter } from "@/lib/diwan/navigation";
import { ErrorLine } from "../admin/kit";
import { Section } from "./section";

/**
 * An assignment from Qirtas's desk, accepted here (decisions.md, Qirtas:
 * "The assignment desk"); once accepted, Start writing makes the piece
 * under the assignee's byline and opens it.
 */
export const AssignmentsToDo = () => {
  const t = useTranslations("diwan.home.toDos.assignment");
  const locale = useLocale() as Locale;
  const { supabase, user } = useAuth();
  const client = useQueryClient();
  const router = useRouter();
  const key = ["home", "assignments", user?.id];
  const mine = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("api")
          .from("story_assignments")
          .select("id, angle, kind, due_on, status")
          .eq("assignee_id", user?.id ?? "")
          .in("status", ["assigned", "accepted"])
          .order("due_on")
      ) ?? [],
    queryKey: key,
  });
  const answer = useMutation({
    mutationFn: async ({ accept, id }: { accept: boolean; id: string }) =>
      unwrap(
        await supabase
          .schema("api")
          .from("story_assignments")
          .update(
            accept
              ? { accepted_at: new Date().toISOString(), status: "accepted" }
              : { status: "declined" }
          )
          .eq("id", id)
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: ["home"] }),
  });
  const start = useMutation({
    mutationFn: async (id: string) =>
      unwrap(
        await supabase.schema("api").rpc("start_assignment", { assignment: id })
      ),
    onSuccess: (piece) => {
      if (piece) {
        router.push(`/qirtas/pieces/${piece}`);
      }
    },
  });
  if (!mine.data?.length) {
    return null;
  }
  return (
    <>
      {mine.data.map((a) => (
        <Section id={`assignment-${a.id}`} key={a.id} title={t("title")}>
          <p className="type-body" dir="auto">
            {a.angle}
          </p>
          <p className="type-caption">
            {[
              t(`kinds.${a.kind as "writing"}`),
              a.due_on
                ? t("due", { date: formatLongDate(a.due_on, locale, true) })
                : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {a.status === "assigned" ? (
              <>
                <Button
                  disabled={answer.isPending}
                  onClick={() => answer.mutate({ accept: true, id: a.id })}
                >
                  {t("accept")}
                </Button>
                <button
                  className="link"
                  onClick={() => answer.mutate({ accept: false, id: a.id })}
                  type="button"
                >
                  {t("decline")}
                </button>
              </>
            ) : (
              <Button
                disabled={start.isPending}
                onClick={() => start.mutate(a.id)}
              >
                {t("start")}
              </Button>
            )}
          </div>
          <ErrorLine error={answer.error ?? start.error} />
        </Section>
      ))}
    </>
  );
};

/** A credit on someone's piece, accepted or declined here. */
export const CreditsToDo = () => {
  const t = useTranslations("diwan.home.toDos.credit");
  const tr = useTranslations("diwan.admin.qirtas.credits.roles");
  const locale = useLocale() as Locale;
  const { supabase, user } = useAuth();
  const client = useQueryClient();
  const credits = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(await supabase.schema("api").rpc("my_credits_to_accept")) ?? [],
    queryKey: ["home", "credits", user?.id],
  });
  const answer = useMutation({
    mutationFn: async (c: {
      accept: boolean;
      contributor_id: string;
      piece_id: string;
    }) =>
      unwrap(
        await supabase.schema("api").rpc("answer_credit", {
          accept: c.accept,
          contributor: c.contributor_id,
          piece: c.piece_id,
        })
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: ["home"] }),
  });
  if (!credits.data?.length) {
    return null;
  }
  return (
    <>
      {credits.data.map((c) => (
        <Section
          id={`credit-${c.piece_id}`}
          key={`${c.piece_id}-${c.contributor_id}`}
          title={t("title")}
        >
          <p className="type-body">
            {t("line", {
              role: tr(c.role as "author"),
              title: localized({ ...c }, "title", locale),
            })}
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Button
              disabled={answer.isPending}
              onClick={() => answer.mutate({ ...c, accept: true })}
            >
              {t("accept")}
            </Button>
            <button
              className="link"
              onClick={() => answer.mutate({ ...c, accept: false })}
              type="button"
            >
              {t("decline")}
            </button>
          </div>
          <ErrorLine error={answer.error} />
        </Section>
      ))}
    </>
  );
};
