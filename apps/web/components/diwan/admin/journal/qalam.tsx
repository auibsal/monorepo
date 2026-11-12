"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { Textarea } from "@repo/brand/components/ui/textarea";
import { formatNumber } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";
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
  // The roster is the students' accounts, made by the parent's consent
  // (qalam-parent-consent); each name comes from the account.
  list: async (year: number) =>
    unwrap(await supabase.schema("programmes").rpc("qalam_roster", { year })) ??
    [],
});

type Student = Awaited<ReturnType<ReturnType<typeof roster>["list"]>>[number];

/**
 * Qalam's roster (decisions.md, Qirtas: Qalam's shape): Qirtas's summer
 * program for high school students. Staff only (`qalam.manage`), never in
 * Notion. Each student is a guest account with the Qalam student role,
 * made when the parent signs the consent (qalam-parent-consent); nobody types a student's
 * name here. Kept three years after the program, then deleted with the
 * consent forms.
 */
export const QalamRoster = () => {
  const t = useTranslations("diwan.admin.qalam");
  const locale = useLocale();
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
              cell: (s) =>
                (locale === "ar" && s.full_name_ar) || s.full_name_en || "",
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
      <p className="type-caption max-w-3xl">{t("joinByConsent")}</p>
      <ParentLinks students={students.data ?? []} />
    </div>
  );
};

/**
 * A parent's consent (qalam-parent-consent) or a publishing release (qalam-publishing-consent), signed by
 * single-use link (decisions §11). The link goes to the teacher, who
 * passes it on: the Society reaches parents only through the teacher.
 */
const ParentLinks = ({ students }: { students: Student[] }) => {
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
          .in("form_key", ["qalam-parent-consent", "qalam-publishing-consent"])
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
              cell: (l) =>
                l.form_key === "qalam-parent-consent"
                  ? t("qalam-parent-consent")
                  : t("qalam-publishing-consent"),
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
            students={students}
          />
        )}
      </AddInPlace>
    </section>
  );
};

type LinkKind = "qalam-parent-consent" | "qalam-publishing-consent";

const EMAILS = /[\s,;]+/u;

/**
 * Sends Qalam's consent to each parent directly (decisions.md, Documents
 * and forms: Qalam): the school gives the parents' addresses with its
 * application, each parent gets their own single-use link, and the teacher
 * gets a copy of each signed consent. The publishing release goes to a
 * parent too, for a student on the roster.
 */
const SendLink = ({
  onDone,
  students,
}: {
  onDone: () => void;
  students: Student[];
}) => {
  const t = useTranslations("diwan.admin.qalam.links");
  const locale = useLocale();
  const { supabase } = useAuth();
  const [form, setForm] = useState<LinkKind>("qalam-parent-consent");
  const [student, setStudent] = useState("");
  const [parents, setParents] = useState("");
  const [teacher, setTeacher] = useState("");
  const [note, setNote] = useState("");
  const send = useMutation({
    mutationFn: async () => {
      const addresses = parents.split(EMAILS).filter(Boolean);
      const sent = await Promise.all(
        addresses.map((parent) =>
          form === "qalam-publishing-consent"
            ? supabase.schema("programmes").rpc("qalam_release_link", {
                note,
                parent_email: parent,
                student_row: student,
                teacher_email: teacher.trim(),
              })
            : supabase.schema("programmes").rpc("qalam_consent_link", {
                note,
                parent_email: parent,
                teacher_email: teacher.trim(),
              })
        )
      );
      for (const result of sent) {
        unwrap(result);
      }
    },
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
            onChange={(e) => setForm(e.target.value as LinkKind)}
            value={form}
          >
            <option value="qalam-parent-consent">
              {t("qalam-parent-consent")}
            </option>
            <option value="qalam-publishing-consent">
              {t("qalam-publishing-consent")}
            </option>
          </SelectInput>
        )}
      </Field>
      {form === "qalam-publishing-consent" ? (
        <Field label={t("student")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) => setStudent(e.target.value)}
              required
              value={student}
            >
              <option value="">{t("pickStudent")}</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {(locale === "ar" && s.full_name_ar) || s.full_name_en}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
      ) : null}
      <Field hint={t("parentsHint")} label={t("parents")}>
        {(id) => (
          <Textarea
            dir="ltr"
            id={id}
            onChange={(e) => setParents(e.target.value)}
            required
            rows={3}
            value={parents}
          />
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
