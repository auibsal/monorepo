"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { formatNumber } from "@repo/internationalization/format";
import { unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { SectionSpinner } from "../../states";
import {
  AddInPlace,
  AdminHeading,
  DataTable,
  ErrorLine,
  Field,
  SaveButton,
  SelectInput,
} from "../kit";

const key = ["admin", "qalam"];

const STATUSES = [
  "applied",
  "accepted",
  "declined",
  "withdrawn",
  "finished",
] as const;
type Status = (typeof STATUSES)[number];

/** The first summer is 2028; the roster shows one year at a time. */
const FIRST_YEAR = 2028;
const thisYear = () => Math.max(FIRST_YEAR, new Date().getFullYear());

const roster = (supabase: ReturnType<typeof useAuth>["supabase"]) => ({
  list: async (year: number) =>
    unwrap(
      await supabase
        .schema("programmes")
        .from("qalam_students")
        .select(
          "id, first_name, last_name, school, grade, status, sessions_attended, photos_allowed, publishing_allowed"
        )
        .eq("year", year)
        .order("last_name")
    ) ?? [],
});

type Student = Awaited<ReturnType<ReturnType<typeof roster>["list"]>>[number];

/**
 * Qalam's applications and roster (decisions.md): Qirtas's summer
 * program for high school students. Staff only (`qalam.manage`), never in
 * Notion; students never get accounts, and their families consent on the
 * forms page (F-38, F-39). Kept three years after the program, then
 * deleted with the consent forms.
 */
export const QalamRoster = () => {
  const t = useTranslations("diwan.admin.qalam");
  const { supabase } = useAuth();
  const [year, setYear] = useState(thisYear());
  const students = useQuery({
    queryFn: () => roster(supabase).list(year),
    queryKey: [...key, year],
  });
  const years = Array.from(
    { length: thisYear() - FIRST_YEAR + 2 },
    (_, i) => FIRST_YEAR + i
  );
  return (
    <div className="grid gap-10">
      <AdminHeading title={t("title")}>{t("lede")}</AdminHeading>
      <Field label={t("year")}>
        {(id) => (
          <SelectInput
            id={id}
            onChange={(e) => setYear(Number(e.target.value))}
            value={String(year)}
          >
            {years.map((y) => (
              <option key={y} value={String(y)}>
                {String(y)}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>
      {students.data ? (
        <DataTable
          columns={[
            {
              cell: (s) => `${s.first_name} ${s.last_name}`,
              header: t("name"),
              key: "name",
            },
            {
              cell: (s) => [s.school, s.grade].filter(Boolean).join(" · "),
              header: t("school"),
              key: "school",
            },
            {
              cell: (s) => <StatusCell student={s} />,
              header: t("status"),
              key: "status",
            },
            {
              cell: (s) => <Attendance student={s} />,
              header: t("sessions"),
              key: "sessions",
            },
            {
              cell: (s) =>
                [
                  s.photos_allowed ? t("photos") : null,
                  s.publishing_allowed ? t("publishing") : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || t("noConsent"),
              header: t("consent"),
              key: "consent",
            },
          ]}
          empty={t("empty")}
          rowKey={(s) => s.id}
          rows={students.data}
        />
      ) : (
        <SectionSpinner />
      )}
      <ErrorLine error={students.error} />
      <AddInPlace label={t("add")}>
        {(close) => <AddStudent onDone={close} year={year} />}
      </AddInPlace>
      <ParentLinks />
    </div>
  );
};

/**
 * A parent's consent (F-38) or a publishing release (F-39), signed by
 * single-use link (decisions §11). The link goes to the teacher, who
 * passes it on: the Society reaches parents only through the teacher.
 */
const ParentLinks = () => {
  const t = useTranslations("diwan.admin.qalam.links");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const links = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("form_links")
          .select(
            "id, form_key, sent_to, note, created_at, expires_at, used_at"
          )
          .in("form_key", ["f38", "f39"])
          .order("created_at", { ascending: false })
          .limit(50)
      ) ?? [],
    queryKey: [...key, "links"],
  });
  const now = Date.now();
  const state = (l: { expires_at: string; used_at: string | null }) => {
    if (l.used_at) {
      return t("signed");
    }
    return Date.parse(l.expires_at) < now ? t("expired") : t("waiting");
  };
  return (
    <section className="grid gap-4">
      <h2 className="type-subheading">{t("title")}</h2>
      <p className="type-caption">{t("lede")}</p>
      {links.data ? (
        <DataTable
          columns={[
            {
              cell: (l) => (l.form_key === "f38" ? "F-38" : "F-39"),
              header: t("form"),
              key: "form",
            },
            { cell: (l) => l.note ?? "", header: t("note"), key: "note" },
            { cell: (l) => l.sent_to, header: t("sentTo"), key: "sent" },
            { cell: state, header: t("state"), key: "state" },
          ]}
          empty={t("empty")}
          rowKey={(l) => l.id}
          rows={links.data}
        />
      ) : (
        <SectionSpinner />
      )}
      <AddInPlace label={t("send")}>
        {(close) => (
          <SendLink
            onDone={() => {
              close();
              queryClient.invalidateQueries({ queryKey: [...key, "links"] });
            }}
          />
        )}
      </AddInPlace>
    </section>
  );
};

const SendLink = ({ onDone }: { onDone: () => void }) => {
  const t = useTranslations("diwan.admin.qalam.links");
  const { supabase } = useAuth();
  const [form, setForm] = useState<"f38" | "f39">("f38");
  const [teacher, setTeacher] = useState("");
  const [note, setNote] = useState("");
  const send = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase.schema("governance").rpc("issue_form_link", {
          form_key: form,
          note,
          sent_to: teacher.trim(),
        })
      ),
    onSuccess: onDone,
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    send.mutate();
  };
  return (
    <form className="grid max-w-xl gap-3" onSubmit={submit}>
      <Field label={t("form")}>
        {(id) => (
          <SelectInput
            id={id}
            onChange={(e) => setForm(e.target.value as "f38" | "f39")}
            value={form}
          >
            <option value="f38">{t("f38")}</option>
            <option value="f39">{t("f39")}</option>
          </SelectInput>
        )}
      </Field>
      <Field hint={t("teacherHint")} label={t("teacher")}>
        {(id) => (
          <Input
            dir="ltr"
            id={id}
            onChange={(e) => setTeacher(e.target.value)}
            required
            type="email"
            value={teacher}
          />
        )}
      </Field>
      <Field hint={t("noteHint")} label={t("note")}>
        {(id) => (
          <Input
            id={id}
            maxLength={300}
            onChange={(e) => setNote(e.target.value)}
            value={note}
          />
        )}
      </Field>
      <SaveButton pending={send.isPending} />
      <ErrorLine error={send.error} />
    </form>
  );
};

const StatusCell = ({ student }: { student: Student }) => {
  const t = useTranslations("diwan.admin.qalam");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: async (status: Status) =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("qalam_students")
          .update({ status })
          .eq("id", student.id)
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  return (
    <div className="grid gap-1">
      <SelectInput
        aria-label={t("status")}
        onChange={(e) => save.mutate(e.target.value as Status)}
        value={student.status}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {t(`statuses.${s}`)}
          </option>
        ))}
      </SelectInput>
      <ErrorLine error={save.error} />
    </div>
  );
};

const Attendance = ({ student }: { student: Student }) => {
  const t = useTranslations("diwan.admin.qalam");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const add = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("qalam_students")
          .update({ sessions_attended: student.sessions_attended + 1 })
          .eq("id", student.id)
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span>{formatNumber(student.sessions_attended)}</span>
      <Button
        disabled={add.isPending}
        onClick={() => add.mutate()}
        size="sm"
        variant="ghost"
      >
        {t("attended")}
      </Button>
      <ErrorLine error={add.error} />
    </div>
  );
};

const AddStudent = ({ onDone, year }: { onDone: () => void; year: number }) => {
  const t = useTranslations("diwan.admin.qalam");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  const add = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("qalam_students")
          .insert({
            first_name: first.trim(),
            grade: grade.trim() || null,
            last_name: last.trim(),
            school: school.trim(),
            year,
          })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key });
      onDone();
    },
  });
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    add.mutate();
  };
  return (
    <form className="grid max-w-xl gap-4" onSubmit={onSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("firstName")}>
          {(id) => (
            <Input
              id={id}
              maxLength={80}
              onChange={(e) => setFirst(e.target.value)}
              required
              value={first}
            />
          )}
        </Field>
        <Field label={t("lastName")}>
          {(id) => (
            <Input
              id={id}
              maxLength={80}
              onChange={(e) => setLast(e.target.value)}
              required
              value={last}
            />
          )}
        </Field>
      </div>
      <Field label={t("school")}>
        {(id) => (
          <Input
            id={id}
            maxLength={200}
            onChange={(e) => setSchool(e.target.value)}
            required
            value={school}
          />
        )}
      </Field>
      <Field label={t("grade")}>
        {(id) => (
          <Input
            id={id}
            maxLength={40}
            onChange={(e) => setGrade(e.target.value)}
            value={grade}
          />
        )}
      </Field>
      <SaveButton pending={add.isPending} />
      <ErrorLine error={add.error} />
    </form>
  );
};
