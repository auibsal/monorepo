"use client";

import { useAuth } from "@repo/auth/provider";
import { Input } from "@repo/design-system/components/ui/input";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { DateInput } from "@/components/fields/date-input";
import { Link, useRouter } from "@/lib/nexus/navigation";
import { OnTheSite } from "../../site-links";
import { EmptyLine, SectionSpinner } from "../../states";
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

// ── Meetings ────────────────────────────────────────────────────────────────

/**
 * Meetings of the Council and the General Assembly (owner, Oct 31, 2026:
 * minutes and resolutions are one thing): each meeting is its minutes, and
 * its resolutions are on its page.
 */
const MeetingsList = () => {
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
          href={`/society/meetings/${m.id}`}
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
      <Link className="link justify-self-start" href="/society/meetings/new">
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
  code: string;
  id: string | null;
  status: "draft" | "adopted" | "rejected" | "withdrawn";
  text: { ar: string; en: string };
  title: { ar: string; en: string };
  votes: { abstain: string; against: string; for: string };
}

const blankResolution = (): ResolutionForm => ({
  adopted_on: "",
  code: `R-${new Date().getFullYear()}-`,
  id: null,
  status: "draft",
  text: { ar: "", en: "" },
  title: { ar: "", en: "" },
  votes: { abstain: "", against: "", for: "" },
});

const toCount = (value: string) => (value === "" ? null : Number(value));

/** A meeting and the resolutions it adopted. */
const useMeeting = (meetingId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () => {
      const [meeting, resolutions] = await Promise.all([
        supabase
          .schema("governance")
          .from("minutes")
          .select("id, body, meeting_on, title_en, title_ar")
          .eq("id", meetingId)
          .maybeSingle(),
        supabase
          .schema("governance")
          .from("resolutions")
          .select("*")
          .eq("minutes_id", meetingId)
          .order("code", { ascending: true }),
      ]);
      return {
        meeting: unwrap(meeting),
        resolutions: unwrap(resolutions) ?? [],
      };
    },
    queryKey: [...key, "meeting", meetingId],
  });
};

type MeetingData = NonNullable<ReturnType<typeof useMeeting>["data"]>;
type ResolutionRow = MeetingData["resolutions"][number];

const formOf = (r: ResolutionRow): ResolutionForm => ({
  adopted_on: r.adopted_on ?? "",
  code: r.code,
  id: r.id,
  status: r.status as ResolutionForm["status"],
  text: { ar: r.text_ar ?? "", en: r.text_en },
  title: { ar: r.title_ar ?? "", en: r.title_en },
  votes: {
    abstain: r.votes_abstain?.toString() ?? "",
    against: r.votes_against?.toString() ?? "",
    for: r.votes_for?.toString() ?? "",
  },
});

/**
 * A meeting's resolutions, on the meeting's page: each opens on its own
 * page by its code (/society/meetings/<meeting>/resolutions/R-2026-01), or
 * /new for a blank one. A resolution always belongs to a meeting.
 */
export const MeetingResolutions = ({
  meetingId,
}: {
  readonly meetingId: string;
}) => {
  const t = useTranslations("nexus.admin.governance");
  const tk = useTranslations("nexus.admin.kit");
  const locale = useLocale() as Locale;
  const data = useMeeting(meetingId);
  const base = `/society/meetings/${meetingId}/resolutions`;
  const columns: Column<ResolutionRow>[] = [
    {
      cell: (r) => <span className="type-code">{r.code}</span>,
      header: t("resolutions.code"),
      key: "code",
    },
    {
      cell: (r) => (
        <Link
          className="font-medium hover:underline"
          href={`${base}/${r.code}`}
        >
          {localized(r, "title", locale)}
        </Link>
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
    <section aria-labelledby="meeting-resolutions" className="grid gap-4">
      <h2 className="type-heading" id="meeting-resolutions">
        {t("resolutions.title")}
      </h2>
      {data.data ? (
        <DataTable
          columns={columns}
          empty={t("resolutions.none")}
          rowKey={(r) => r.id}
          rows={data.data.resolutions}
        />
      ) : (
        <SectionSpinner />
      )}
      <Link className="link justify-self-start" href={`${base}/new`}>
        {t("resolutions.new")}
      </Link>
    </section>
  );
};

/** One resolution on its own page, by its code; new for a blank one. */
export const ResolutionPage = ({
  code,
  meetingId,
}: {
  readonly code: string;
  readonly meetingId: string;
}) => {
  const t = useTranslations("nexus.admin.governance");
  const locale = useLocale() as Locale;
  const data = useMeeting(meetingId);
  const back = `/society/meetings/${meetingId}`;
  if (data.isPending) {
    return <SectionSpinner />;
  }
  const row =
    code === "new"
      ? undefined
      : data.data?.resolutions.find((r) => r.code === code || r.id === code);
  const meeting = data.data?.meeting;
  if (!meeting || (code !== "new" && !row)) {
    return (
      <EmptyLine action={{ href: back, label: t("resolutions.back") }}>
        {t("resolutions.missing")}
      </EmptyLine>
    );
  }
  return (
    <div className="grid max-w-3xl gap-8">
      <AdminHeading
        actions={
          <>
            <Link className="link" href={back}>
              {t("resolutions.back")}
            </Link>
            {row?.status === "adopted" ? (
              <OnTheSite href="/about/council" />
            ) : null}
          </>
        }
        title={row ? localized(row, "title", locale) : t("resolutions.new")}
      >
        {`${t(`bodies.${meeting.body as "council" | "general_assembly"}`)} · ${formatLongDate(meeting.meeting_on, locale, true)}`}
      </AdminHeading>
      <ResolutionEditor
        back={back}
        initial={row ? formOf(row) : blankResolution()}
        meeting={meeting}
      />
    </div>
  );
};

const ResolutionEditor = ({
  back,
  initial,
  meeting,
}: {
  readonly back: string;
  readonly initial: ResolutionForm;
  readonly meeting: NonNullable<MeetingData["meeting"]>;
}) => {
  const t = useTranslations("nexus.admin.governance");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const tk = useTranslations("nexus.admin.kit");
  const router = useRouter();
  const [form, setForm] = useState<ResolutionForm>(initial);
  const [problem, setProblem] = useState<string | null>(null);
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
        body: meeting.body,
        code: form.code,
        minutes_id: meeting.id,
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
      await queryClient.invalidateQueries({ queryKey: key });
      router.push(back);
    },
  });

  return (
    <form
      className="grid max-w-3xl gap-4"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("resolutions.code")}>
          {(id) => (
            <Input
              className="type-code"
              dir="ltr"
              id={id}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              required
              value={form.code}
            />
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
            <DateInput
              id={id}
              onChange={(e) =>
                setForm((f) => ({ ...f, adopted_on: e.target.value }))
              }
              value={form.adopted_on}
            />
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
      </div>
      {save.error && save.error.message !== "invalid" ? (
        <ErrorLine error={save.error} />
      ) : null}
    </form>
  );
};

// ── Page ────────────────────────────────────────────────────────────────────

export type SocietyViewKey =
  | "meetings"
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
      {view === "meetings" ? (
        <>
          <MeetingsList />
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
