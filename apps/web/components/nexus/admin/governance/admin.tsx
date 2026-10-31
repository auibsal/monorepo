"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { Link } from "@/lib/nexus/navigation";
import { SectionSpinner } from "../../states";
import { LibraryAdmin } from "../documents/admin";
import { RequestQueue } from "../forms/admin";
import {
  AdminHeading,
  BilingualField,
  type Column,
  DataTable,
  ErrorLine,
  ExportButton,
  Field,
  SaveButton,
  SelectInput,
} from "../kit";
import { Needs } from "../needs";
import { Elections } from "./elections";

const key = ["admin", "governance"];
const RESOLUTION_CODE = /^R-\d{4}-\d{2,3}$/;

type Status =
  | "draft"
  | "adopted"
  | "rejected"
  | "withdrawn"
  | "superseded"
  | "pending"
  | "approved";

// ── Council ─────────────────────────────────────────────────────────────────

const MinutesList = () => {
  const t = useTranslations("nexus.admin.governance");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const minutes = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("minutes")
          .select(
            "id, body, meeting_on, title_en, title_ar, status, adopted_on"
          )
          .order("meeting_on", { ascending: false })
      ) ?? [],
    queryKey: [...key, "minutes"],
  });
  type Row = NonNullable<typeof minutes.data>[number];
  const columns: Column<Row>[] = [
    {
      cell: (m) => (
        <Link
          className="font-medium underline underline-offset-4"
          href={`/society/minutes/${m.id}`}
        >
          {localized(m, "title", locale)}
        </Link>
      ),
      header: t("minutes.titleField"),
      key: "title",
    },
    {
      cell: (m) => formatLongDate(m.meeting_on, locale, true),
      className: "whitespace-nowrap",
      header: t("minutes.meetingOn"),
      key: "date",
    },
    {
      cell: (m) => t(`bodies.${m.body as "council" | "general_assembly"}`),
      header: t("minutes.body"),
      key: "body",
    },
    {
      cell: (m) =>
        m.status === "adopted" && m.adopted_on
          ? `${t("statuses.adopted")}, ${formatLongDate(m.adopted_on, locale, true)}`
          : t("statuses.draft"),
      header: "",
      key: "status",
    },
  ];
  return (
    <div className="grid gap-4">
      <Link
        className="inline-flex h-8 items-center justify-self-start rounded-md bg-primary px-3 text-primary-foreground text-sm"
        href="/society/minutes/new"
      >
        {t("minutes.new")}
      </Link>
      <p className="type-caption">{t("minutes.draftNote")}</p>
      {minutes.data ? (
        <DataTable columns={columns} rowKey={(m) => m.id} rows={minutes.data} />
      ) : (
        <SectionSpinner />
      )}
    </div>
  );
};

// ── Resolutions ─────────────────────────────────────────────────────────────

interface ResolutionForm {
  adopted_on: string;
  body: "council" | "general_assembly";
  code: string;
  id: string | null;
  minutes_id: string;
  status: "draft" | "adopted" | "rejected" | "withdrawn";
  text: { ar: string; en: string };
  title: { ar: string; en: string };
  votes: { abstain: string; against: string; for: string };
}

const blankResolution = (): ResolutionForm => ({
  adopted_on: "",
  body: "council",
  code: `R-${new Date().getFullYear()}-`,
  id: null,
  minutes_id: "",
  status: "draft",
  text: { ar: "", en: "" },
  title: { ar: "", en: "" },
  votes: { abstain: "", against: "", for: "" },
});

const toCount = (value: string) => (value === "" ? null : Number(value));

const Resolutions = () => {
  const t = useTranslations("nexus.admin.governance");
  const tk = useTranslations("nexus.admin.kit");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ResolutionForm>(blankResolution);
  const [problem, setProblem] = useState<string | null>(null);
  const data = useQuery({
    queryFn: async () => {
      const [resolutions, minutes] = await Promise.all([
        supabase
          .schema("governance")
          .from("resolutions")
          .select("*")
          .order("code", { ascending: false }),
        supabase
          .schema("governance")
          .from("minutes")
          .select("id, title_en, title_ar, meeting_on")
          .order("meeting_on", { ascending: false }),
      ]);
      return {
        minutes: unwrap(minutes) ?? [],
        resolutions: unwrap(resolutions) ?? [],
      };
    },
    queryKey: [...key, "resolutions"],
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!RESOLUTION_CODE.test(form.code)) {
        setProblem(t("resolutions.codeError"));
        throw new Error("invalid");
      }
      if ((form.status === "adopted") !== Boolean(form.adopted_on)) {
        setProblem(t("resolutions.adoptedOnError"));
        throw new Error("invalid");
      }
      setProblem(null);
      const row = {
        adopted_on: form.adopted_on || null,
        body: form.body,
        code: form.code,
        minutes_id: form.minutes_id || null,
        status: form.status,
        text_ar: form.text.ar || null,
        text_en: form.text.en,
        title_ar: form.title.ar || null,
        title_en: form.title.en,
        votes_abstain: toCount(form.votes.abstain),
        votes_against: toCount(form.votes.against),
        votes_for: toCount(form.votes.for),
      };
      const table = supabase.schema("governance").from("resolutions");
      unwrap(
        form.id
          ? await table.update(row).eq("id", form.id)
          : await table.insert(row)
      );
    },
    onSuccess: async () => {
      setForm(blankResolution());
      await queryClient.invalidateQueries({ queryKey: key });
    },
  });

  type Row = NonNullable<typeof data.data>["resolutions"][number];
  const columns: Column<Row>[] = [
    {
      cell: (r) => <span className="type-code">{r.code}</span>,
      header: t("resolutions.code"),
      key: "code",
    },
    {
      cell: (r) => (
        <button
          className="text-start font-medium underline underline-offset-4"
          onClick={() =>
            setForm({
              adopted_on: r.adopted_on ?? "",
              body: r.body as "council" | "general_assembly",
              code: r.code,
              id: r.id,
              minutes_id: r.minutes_id ?? "",
              status: r.status as ResolutionForm["status"],
              text: { ar: r.text_ar ?? "", en: r.text_en },
              title: { ar: r.title_ar ?? "", en: r.title_en },
              votes: {
                abstain: r.votes_abstain?.toString() ?? "",
                against: r.votes_against?.toString() ?? "",
                for: r.votes_for?.toString() ?? "",
              },
            })
          }
          type="button"
        >
          {localized(r, "title", locale)}
        </button>
      ),
      header: t("resolutions.titleField"),
      key: "title",
    },
    {
      cell: (r) =>
        r.status === "adopted" && r.adopted_on
          ? `${t("statuses.adopted")}, ${formatLongDate(r.adopted_on, locale, true)}`
          : t(`statuses.${r.status as Status}`),
      header: tk("status"),
      key: "status",
    },
  ];

  return (
    <div className="grid gap-6">
      {data.data ? (
        <DataTable
          columns={columns}
          rowKey={(r) => r.id}
          rows={data.data.resolutions}
        />
      ) : (
        <SectionSpinner />
      )}
      <form
        className="grid max-w-3xl gap-4"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <h3 className="type-subheading">
          {form.id ? t("resolutions.edit") : t("resolutions.new")}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("resolutions.code")}>
            {(id) => (
              <Input
                className="type-code"
                dir="ltr"
                id={id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value }))
                }
                required
                value={form.code}
              />
            )}
          </Field>
          <Field label={t("minutes.body")}>
            {(id) => (
              <SelectInput
                id={id}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    body: e.target.value as ResolutionForm["body"],
                  }))
                }
                value={form.body}
              >
                <option value="council">{t("bodies.council")}</option>
                <option value="general_assembly">
                  {t("bodies.general_assembly")}
                </option>
              </SelectInput>
            )}
          </Field>
        </div>
        <BilingualField
          label={t("resolutions.titleField")}
          maxLength={300}
          onChange={(title) => setForm((f) => ({ ...f, title }))}
          value={form.title}
        />
        <BilingualField
          label={t("resolutions.text")}
          multiline
          onChange={(text) => setForm((f) => ({ ...f, text }))}
          rows={5}
          value={form.text}
        />
        <fieldset className="grid gap-3 sm:grid-cols-3">
          <legend className="mb-2 font-medium text-sm">
            {t("resolutions.votes")}
          </legend>
          {(["for", "against", "abstain"] as const).map((vote) => (
            <Field key={vote} label={t(`resolutions.${vote}`)}>
              {(id) => (
                <Input
                  dir="ltr"
                  id={id}
                  min={0}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      votes: { ...f.votes, [vote]: e.target.value },
                    }))
                  }
                  type="number"
                  value={form.votes[vote]}
                />
              )}
            </Field>
          ))}
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={tk("status")}>
            {(id) => (
              <SelectInput
                id={id}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as ResolutionForm["status"],
                  }))
                }
                value={form.status}
              >
                {(["draft", "adopted", "rejected", "withdrawn"] as const).map(
                  (s) => (
                    <option key={s} value={s}>
                      {t(`statuses.${s}`)}
                    </option>
                  )
                )}
              </SelectInput>
            )}
          </Field>
          <Field label={t("minutes.adoptedOn")}>
            {(id) => (
              <Input
                dir="ltr"
                id={id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, adopted_on: e.target.value }))
                }
                type="date"
                value={form.adopted_on}
              />
            )}
          </Field>
          <Field label={t("resolutions.minutes")}>
            {(id) => (
              <SelectInput
                id={id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, minutes_id: e.target.value }))
                }
                value={form.minutes_id}
              >
                <option value="">{t("resolutions.noMinutes")}</option>
                {data.data?.minutes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {formatLongDate(m.meeting_on, locale, true)} ·{" "}
                    {localized(m, "title", locale)}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
        </div>
        {problem ? (
          <p className="text-sm text-text" role="alert">
            {problem}
          </p>
        ) : null}
        <div className="flex gap-3">
          <SaveButton pending={save.isPending} />
          {form.id ? (
            <Button
              onClick={() => setForm(blankResolution())}
              type="button"
              variant="ghost"
            >
              {t("resolutions.new")}
            </Button>
          ) : null}
        </div>
        {save.error && save.error.message !== "invalid" ? (
          <ErrorLine error={save.error} />
        ) : null}
      </form>
    </div>
  );
};

// ── Page ────────────────────────────────────────────────────────────────────

export type SocietyViewKey =
  | "minutes"
  | "resolutions"
  | "requests"
  | "elections"
  | "concerns"
  | "library";

/**
 * Society in the Diwan (the overhaul, Oct 30, 2026), one view per address.
 * The Council is whoever holds a Council role (the member's page assigns
 * them; the public Council page and Membership → Society list them), so it
 * has no view of its own here.
 */
export const SocietyView = ({ view }: { readonly view: SocietyViewKey }) => {
  const t = useTranslations("nexus.admin.society");
  return (
    <div className="grid gap-6">
      {/* The Library's own page has its heading. */}
      {view === "library" ? null : (
        <AdminHeading title={t(`${view}.title`)}>
          {t(`${view}.lede`)}
        </AdminHeading>
      )}
      {view === "minutes" ? <MinutesList /> : null}
      {view === "resolutions" ? (
        <>
          <Resolutions />
          <RequestQueue keys={["f09"]} />
        </>
      ) : null}
      {view === "requests" ? (
        <div className="grid gap-4">
          <ExportButton fileName="sal-needs.csv" name="needs" />
          <Needs />
        </div>
      ) : null}
      {view === "elections" ? <Elections /> : null}
      {view === "concerns" ? <RequestQueue keys={["f19", "f20"]} /> : null}
      {view === "library" ? <LibraryAdmin /> : null}
    </div>
  );
};
