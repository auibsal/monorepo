"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Input } from "@repo/brand/components/ui/input";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { DateInput } from "@/components/fields/date-input";
import {
  AddInPlace,
  ErrorLine,
  Field,
  SaveButton,
  SelectInput,
} from "../admin/kit";

type Side = "society" | "partner";

const key = (eventId: string) => ["joint-tasks", eventId];

const NewItem = ({
  eventId,
  onDone,
  sides,
}: {
  readonly eventId: string;
  readonly onDone: () => void;
  readonly sides: readonly Side[];
}) => {
  const t = useTranslations("nexus.joint");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");
  const [side, setSide] = useState<Side>(sides[0] ?? "partner");
  const [due, setDue] = useState("");
  const add = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("events")
          .from("joint_tasks")
          .insert({
            due_on: due || null,
            event_id: eventId,
            label: label.trim(),
            side,
          })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key(eventId) });
      onDone();
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    add.mutate();
  };
  return (
    <form className="grid gap-4" onSubmit={submit}>
      <Field label={t("item")}>
        {(id) => (
          <Input
            dir="auto"
            id={id}
            maxLength={200}
            onChange={(e) => setLabel(e.target.value)}
            required
            value={label}
          />
        )}
      </Field>
      {sides.length > 1 ? (
        <Field label={t("whose")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) => setSide(e.target.value as Side)}
              value={side}
            >
              {sides.map((s) => (
                <option key={s} value={s}>
                  {t(`sides.${s}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
      ) : null}
      <Field label={t("due")}>
        {(id) => (
          <DateInput
            className="max-w-xs"
            id={id}
            onChange={(e) => setDue(e.target.value)}
            value={due}
          />
        )}
      </Field>
      <SaveButton disabled={!label.trim()} pending={add.isPending} />
      <ErrorLine error={add.error} />
    </form>
  );
};

/**
 * A joint event's checklist (the design review A41), the same list on the
 * event's page in the Diwan and on the partner's dashboard: the Society's
 * items and the partner's, each ticked by its side (the database decides;
 * the event's managers may tick and change all).
 */
export const JointChecklist = ({
  eventId,
  society,
}: {
  readonly eventId: string;
  /** Shown to the event's managers: both sides' items are theirs to keep. */
  readonly society: boolean;
}) => {
  const t = useTranslations("nexus.joint");
  const locale = useLocale() as Locale;
  const id = useId();
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const tasks = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("events")
          .from("joint_tasks")
          .select("id, side, label, due_on, done_at")
          .eq("event_id", eventId)
          .order("created_at")
      ) ?? [],
    queryKey: key(eventId),
  });
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: key(eventId) });
  const tick = useMutation({
    mutationFn: async ({ done, task }: { done: boolean; task: string }) =>
      unwrap(
        await supabase
          .schema("events")
          .from("joint_tasks")
          .update({ done_at: done ? new Date().toISOString() : null })
          .eq("id", task)
      ),
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: async (task: string) =>
      unwrap(
        await supabase
          .schema("events")
          .from("joint_tasks")
          .delete()
          .eq("id", task)
      ),
    onSettled: refresh,
  });
  const mine = (side: string) => society || side === "partner";
  const sides: Side[] = society ? ["society", "partner"] : ["partner"];
  const list = tasks.data ?? [];
  return (
    <div className="grid gap-4">
      {(["society", "partner"] as const).map((side) => {
        const items = list.filter((x) => x.side === side);
        return (
          <div className="grid gap-2" key={side}>
            <p className="type-label">{t(`sides.${side}`)}</p>
            {items.length === 0 ? (
              <p className="type-caption text-text-secondary">{t("none")}</p>
            ) : (
              <ul className="grid gap-2">
                {items.map((item) => (
                  <li className="flex items-start gap-3" key={item.id}>
                    <Checkbox
                      checked={item.done_at !== null}
                      disabled={!mine(item.side) || tick.isPending}
                      id={`${id}-${item.id}`}
                      onCheckedChange={(v) =>
                        tick.mutate({ done: v === true, task: item.id })
                      }
                    />
                    <label
                      className="grid flex-1 gap-0.5"
                      htmlFor={`${id}-${item.id}`}
                    >
                      <span
                        className={
                          item.done_at ? "text-text-secondary line-through" : ""
                        }
                        dir="auto"
                      >
                        {item.label}
                      </span>
                      {item.due_on ? (
                        <span className="type-caption text-text-secondary">
                          {t("by", {
                            date: formatLongDate(
                              `${item.due_on}T12:00:00+03:00`,
                              locale
                            ),
                          })}
                        </span>
                      ) : null}
                    </label>
                    {mine(item.side) ? (
                      <Button
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(item.id)}
                        size="sm"
                        variant="ghost"
                      >
                        {t("remove")}
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
      <AddInPlace label={t("new")}>
        {(close) => <NewItem eventId={eventId} onDone={close} sides={sides} />}
      </AddInPlace>
      <ErrorLine error={tick.error ?? remove.error} />
    </div>
  );
};
