"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { formatNumber } from "@repo/internationalization/format";
import { unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";
import { DateInput } from "@/components/fields/date-input";
import { SectionSpinner } from "../../states";
import {
  BilingualField,
  ErrorLine,
  Field,
  SaveButton,
  SelectInput,
} from "../kit";

const blank = {
  capacity: "",
  entry: "open" as "open" | "rsvp",
  every_weeks: "1",
  first_on: "",
  members_only: false,
  minutes: "120",
  start_time: "18:00",
  venue: { ar: "", en: "" },
};

/**
 * How a program repeats (What's on, owner 2026-10-25): the first session,
 * the time, the place, the way in and how often. "Add the sessions" turns it
 * into dated events up to a day (the term's end by default); each is then
 * edited or canceled in Events like any other. Running it again after a
 * change adds only the dates that are missing.
 */
export const Sessions = ({ programmeId }: { programmeId: string }) => {
  const t = useTranslations("nexus.admin.programmes.sessions");
  const locale = useLocale();
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(blank);
  const [until, setUntil] = useState("");

  const rule = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("events")
          .from("series_rules")
          .select("*")
          .eq("programme_id", programmeId)
          .maybeSingle()
      ),
    queryKey: ["admin", "series-rule", programmeId],
  });
  const term = useQuery({
    queryFn: async () =>
      unwrap(await supabase.schema("core").rpc("current_semester")),
    queryKey: ["current-semester"],
  });

  useEffect(() => {
    const r = rule.data;
    setForm(
      r
        ? {
            capacity: r.capacity ? String(r.capacity) : "",
            entry: r.entry === "rsvp" ? "rsvp" : "open",
            every_weeks: String(r.every_weeks),
            first_on: r.first_on,
            members_only: r.members_only,
            minutes: String(r.minutes),
            start_time: r.start_time.slice(0, 5),
            venue: { ar: r.venue_ar ?? "", en: r.venue_en ?? "" },
          }
        : blank
    );
  }, [rule.data]);
  useEffect(() => {
    if (term.data?.ends_on) {
      setUntil(term.data.ends_on);
    }
  }, [term.data]);

  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("events")
          .from("series_rules")
          .upsert({
            capacity:
              form.entry === "rsvp" && form.capacity
                ? Number(form.capacity)
                : null,
            entry: form.entry,
            every_weeks: Number(form.every_weeks),
            first_on: form.first_on,
            members_only: form.members_only,
            minutes: Number(form.minutes),
            programme_id: programmeId,
            start_time: form.start_time,
            venue_ar: form.venue.ar || null,
            venue_en: form.venue.en || null,
          })
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["admin", "series-rule", programmeId],
      }),
  });
  const add = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("events")
          .rpc("add_series_sessions", { programme: programmeId, until })
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin"] }),
  });

  if (rule.isPending) {
    return <SectionSpinner />;
  }

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save.mutate();
  };

  return (
    <div className="grid max-w-3xl gap-8">
      <p className="type-body text-text-secondary">{t("lede")}</p>
      <form className="grid gap-4" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field hint={t("firstHint")} label={t("first")}>
            {(id) => (
              <DateInput
                id={id}
                onChange={(e) => set("first_on", e.target.value)}
                required
                value={form.first_on}
              />
            )}
          </Field>
          <Field label={t("time")}>
            {(id) => (
              <Input
                id={id}
                onChange={(e) => set("start_time", e.target.value)}
                required
                type="time"
                value={form.start_time}
              />
            )}
          </Field>
          <Field label={t("minutes")}>
            {(id) => (
              <Input
                id={id}
                inputMode="numeric"
                max={720}
                min={15}
                onChange={(e) => set("minutes", e.target.value)}
                required
                type="number"
                value={form.minutes}
              />
            )}
          </Field>
        </div>
        <Field hint={t("everyHint")} label={t("every")}>
          {(id) => (
            <SelectInput
              className="max-w-xs"
              id={id}
              onChange={(e) => set("every_weeks", e.target.value)}
              value={form.every_weeks}
            >
              {["1", "2", "3", "4"].map((n) => (
                <option key={n} value={n}>
                  {t("weeks", {
                    count: Number(n),
                    shown: formatNumber(Number(n), locale as "en" | "ar"),
                  })}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <BilingualField
          label={t("venue")}
          maxLength={200}
          onChange={(value) => set("venue", value)}
          value={form.venue}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("entry")}>
            {(id) => (
              <SelectInput
                id={id}
                onChange={(e) =>
                  set("entry", e.target.value === "rsvp" ? "rsvp" : "open")
                }
                value={form.entry}
              >
                <option value="open">{t("open")}</option>
                <option value="rsvp">{t("rsvp")}</option>
              </SelectInput>
            )}
          </Field>
          {form.entry === "rsvp" ? (
            <Field label={t("capacity")}>
              {(id) => (
                <Input
                  id={id}
                  inputMode="numeric"
                  min={1}
                  onChange={(e) => set("capacity", e.target.value)}
                  type="number"
                  value={form.capacity}
                />
              )}
            </Field>
          ) : null}
        </div>
        <div className="flex items-start gap-3">
          <Checkbox
            checked={form.members_only}
            id={`members-only-${programmeId}`}
            onCheckedChange={(value) => set("members_only", value === true)}
          />
          <Label
            className="leading-normal"
            htmlFor={`members-only-${programmeId}`}
          >
            {t("membersOnly")}
          </Label>
        </div>
        <SaveButton pending={save.isPending} success={save.isSuccess} />
        <ErrorLine error={save.error} />
      </form>

      {rule.data ? (
        <section className="grid gap-3 border-line border-t pt-space-4">
          <h3 className="type-heading">{t("addTitle")}</h3>
          <p className="type-body text-text-secondary">{t("addBody")}</p>
          <Field label={t("until")}>
            {(id) => (
              <DateInput
                className="max-w-xs"
                id={id}
                onChange={(e) => setUntil(e.target.value)}
                value={until}
              />
            )}
          </Field>
          <Button
            className="justify-self-start"
            disabled={!until || add.isPending}
            onClick={() => add.mutate()}
            type="button"
            variant="outline"
          >
            {t("add")}
          </Button>
          {add.isSuccess ? (
            <p className="type-body" role="status">
              {t("added", {
                count: add.data ?? 0,
                shown: formatNumber(add.data ?? 0, locale as "en" | "ar"),
              })}
            </p>
          ) : null}
          <ErrorLine error={add.error} />
        </section>
      ) : null}
    </div>
  );
};
