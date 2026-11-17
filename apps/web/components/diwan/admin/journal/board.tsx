"use client";

import { Input } from "@repo/brand/components/ui/input";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { slugFromTitle } from "@/lib/addresses";
import { useAuth } from "@/lib/auth/provider";
import { type journal, unwrap } from "@/lib/data";
import { Link } from "@/lib/diwan/navigation";
import { DiwanSection } from "../../page";
import { AddInPlace, ErrorLine, Field, SaveButton, SelectInput } from "../kit";
import { MemberPicker, type Person, useMemberNames } from "../member-picker";
import { memberName } from "../members/directory";

/** The board's columns (decisions.md, Qirtas: "The assignment desk"). */
const STAGES = [
  "pitched",
  "assigned",
  "drafting",
  "editing",
  "copy",
  "ready",
  "published",
] as const;
const KINDS = ["writing", "photos", "art"] as const;

const boardKey = (desk: string) => ["admin", "desk-board", desk];

/** A new assignment, or a writer's pitch: slug, angle, kind, due date, assignee. */
const AssignmentForm = ({
  close,
  desk,
  pitch,
}: {
  readonly close: () => void;
  readonly desk: journal.Desk;
  readonly pitch: boolean;
}) => {
  const t = useTranslations("diwan.admin.board");
  const { supabase, user } = useAuth();
  const client = useQueryClient();
  const [angle, setAngle] = useState("");
  const [kind, setKind] = useState<(typeof KINDS)[number]>("writing");
  const [due, setDue] = useState("");
  const [assignee, setAssignee] = useState<Person | null>(null);
  const add = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("api")
          .from("story_assignments")
          .insert({
            angle,
            assignee_id: pitch ? (user?.id ?? null) : (assignee?.id ?? null),
            created_by: user?.id ?? null,
            desk,
            due_on: due || null,
            kind,
            slug: slugFromTitle(angle) || "story",
            status: pitch ? "pitched" : "assigned",
          })
      ),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: boardKey(desk) });
      close();
    },
  });
  return (
    <form
      className="grid max-w-2xl gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        add.mutate();
      }}
    >
      <Field hint={t("angleHint")} label={t("angle")}>
        {(id) => (
          <Input
            dir="auto"
            id={id}
            maxLength={1000}
            onChange={(e) => setAngle(e.target.value)}
            required
            value={angle}
          />
        )}
      </Field>
      <Field label={t("kind")}>
        {(id) => (
          <SelectInput
            id={id}
            onChange={(e) => setKind(e.target.value as (typeof KINDS)[number])}
            value={kind}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`kinds.${k}`)}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>
      <Field label={t("due")}>
        {(id) => (
          <Input
            className="max-w-48"
            id={id}
            onChange={(e) => setDue(e.target.value)}
            type="date"
            value={due}
          />
        )}
      </Field>
      {pitch ? null : (
        <MemberPicker
          label={t("assignee")}
          onChange={setAssignee}
          value={assignee}
        />
      )}
      <SaveButton
        disabled={!(angle.trim() && (pitch || assignee))}
        pending={add.isPending}
        success={add.isSuccess}
      />
      <ErrorLine error={add.error} />
    </form>
  );
};

/**
 * A section's board (decisions.md, Qirtas: "The assignment desk"):
 * Pitched, Assigned, Drafting, Editing, Copy, Ready, Published. An editor
 * assigns; anyone on the staff pitches; the assignee accepts from Today and
 * the assignment becomes the piece when writing starts.
 */
export const DeskBoard = ({
  desk,
  edits,
}: {
  readonly desk: journal.Desk;
  /** The section's editors see the board and assign. */
  readonly edits: boolean;
}) => {
  const t = useTranslations("diwan.admin.board");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const board = useQuery({
    enabled: edits,
    queryFn: async () =>
      unwrap(
        await supabase.schema("api").rpc("desk_board", { for_desk: desk })
      ) ?? [],
    queryKey: boardKey(desk),
  });
  const names = useMemberNames((board.data ?? []).map((c) => c.person));
  const nameOf = (id: string | null) => {
    const person = names.data?.find((p) => p.id === id);
    return person ? memberName(person, locale) : "";
  };
  return (
    <DiwanSection description={t("lede")} id="board" title={t("title")}>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {edits ? (
          <AddInPlace label={t("assign")}>
            {(close) => (
              <AssignmentForm close={close} desk={desk} pitch={false} />
            )}
          </AddInPlace>
        ) : null}
        <AddInPlace label={t("pitch")}>
          {(close) => <AssignmentForm close={close} desk={desk} pitch />}
        </AddInPlace>
      </div>
      {edits ? (
        <div className="grid gap-6 lg:grid-cols-7 lg:gap-4">
          {STAGES.map((stage) => {
            const cards = (board.data ?? []).filter((c) => c.stage === stage);
            return (
              <section
                aria-labelledby={`board-${stage}`}
                className="border-line grid content-start gap-3 border-t pt-3"
                key={stage}
              >
                <h3 className="type-label" id={`board-${stage}`}>
                  {t(`stages.${stage}`)} · {cards.length}
                </h3>
                <ul className="grid gap-3">
                  {cards.map((card) => (
                    <li className="grid gap-1" key={card.id}>
                      {card.kind === "piece" ? (
                        <Link
                          className="link type-body"
                          dir="auto"
                          href={`/qirtas/pieces/${card.id}`}
                        >
                          {card.title || t("untitled")}
                        </Link>
                      ) : (
                        <span className="type-body" dir="auto">
                          {card.title}
                        </span>
                      )}
                      <span className="type-caption">
                        {[
                          nameOf(card.person),
                          card.due_on
                            ? t("dueOn", {
                                date: formatLongDate(card.due_on, locale, true),
                              })
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : null}
    </DiwanSection>
  );
};
