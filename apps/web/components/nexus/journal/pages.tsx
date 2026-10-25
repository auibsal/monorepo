"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import type { Locale } from "@repo/internationalization";
import {
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link, useRouter } from "@repo/internationalization/navigation";
import { journal, localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";
import {
  queryKeys,
  useMemberStatus,
  useMySubmissions,
  useOpenCalls,
} from "@/lib/nexus/queries";
import { useQueryParam } from "@/lib/nexus/use-query-param";
import {
  AdminHeading,
  type Column,
  ConfirmAction,
  DataTable,
  ErrorLine,
  Field,
  SaveButton,
  SelectInput,
} from "../admin/kit";
import { DiwanSection } from "../page";
import { SectionSpinner } from "../states";
import {
  attachFile,
  detachFile,
  FilePicker,
  kindsFor,
  type PendingFile,
  PendingList,
} from "./files";
import {
  AuthorshipPledge,
  blankWork,
  Declarations,
  revisableColumns,
  WorkFields,
  type WorkValue,
  workIsReady,
} from "./form";

const buttonLink =
  "inline-flex h-9 items-center justify-self-start rounded-md bg-primary px-4 text-primary-foreground text-sm";
const FINAL: journal.SubmissionStatus[] = ["accepted", "declined", "withdrawn"];

const useInvalidate = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.submissions(user?.id ?? ""),
    });
};

// ── Journal home ──────────────────────────────────────────────────────────────

/** The author's desk pieces (and accepted Edition work) in the newsroom. */
const useMyPieces = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () => {
      const mine =
        unwrap(await supabase.schema("journal").rpc("my_contributors")) ?? [];
      if (mine.length === 0) {
        return [];
      }
      return (
        unwrap(
          await supabase
            .schema("journal")
            .from("pieces")
            .select("id, title_en, title_ar, category, status, updated_at")
            .in(
              "contributor_id",
              mine.map((c) => c.id)
            )
            .order("updated_at", { ascending: false })
        ) ?? []
      );
    },
    queryKey: ["journal", "my-pieces"],
  });
};

/** One row of "Your work": an Edition submission or a desk piece. */
interface Sent {
  date: string;
  href: {
    pathname: "/qirtas/submission" | "/qirtas/work";
    query: { id: string };
  };
  id: string;
  process: "desk" | "edition";
  status: string;
  title: string;
  type: string;
}

/**
 * Write for Qirtas: one place for everything sent to the paper. The member
 * picks a type; the type decides the process (edited on a desk, or read
 * blind for an Edition). Below, everything they have sent, either way.
 */
export const JournalHome = () => {
  const t = useTranslations("nexus.journal");
  const tw = useTranslations("nexus.journal.write");
  const tn = useTranslations("nexus.waraq");
  const tp = useTranslations("nexus.admin.waraq");
  const tj = useTranslations("nexus.admin.journal");
  const locale = useLocale() as Locale;
  const calls = useOpenCalls();
  const submissions = useMySubmissions();
  const pieces = useMyPieces();

  const sent: Sent[] = [
    ...(submissions.data ?? []).map(
      (s): Sent => ({
        date: s.created_at,
        href: { pathname: "/qirtas/submission", query: { id: s.id } },
        id: `s-${s.id}`,
        process: "edition",
        status:
          s.status === "intake_check" && s.intake_returned_at
            ? t("returned")
            : t(`status.${s.status}`),
        title: s.title,
        type: tj(`categories.${s.category}`),
      })
    ),
    ...(pieces.data ?? []).map(
      (p): Sent => ({
        date: p.updated_at,
        href: { pathname: "/qirtas/work", query: { id: p.id } },
        id: `p-${p.id}`,
        process: "desk",
        status: tp(`statuses.${p.status as journal.PieceStatus}`),
        title: localized(p, "title", locale) || tn("pieceTitle"),
        type: tj(`categories.${p.category}`),
      })
    ),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const columns: Column<Sent>[] = [
    {
      cell: (row) => (
        <Link
          className="font-medium underline underline-offset-4"
          href={row.href}
        >
          {row.title}
        </Link>
      ),
      header: t("columns.title"),
      key: "title",
    },
    { cell: (row) => row.type, header: t("columns.category"), key: "type" },
    {
      cell: (row) => tw(`processes.${row.process}`),
      header: tw("process"),
      key: "process",
    },
    { cell: (row) => row.status, header: t("columns.status"), key: "status" },
    {
      cell: (row) => formatLongDate(row.date, locale),
      className: "whitespace-nowrap",
      header: tw("updated"),
      key: "date",
    },
  ];

  const openCalls = calls.data ?? [];

  return (
    <div className="grid gap-8">
      <AdminHeading title={t("title")}>{tw("lede")}</AdminHeading>
      <DiwanSection id="newsroom" title={tw("newsroomTitle")}>
        <p className="max-w-3xl text-text-secondary">{tw("newsroomLede")}</p>
        <DeskList desks={journal.newsroomDesks} />
      </DiwanSection>
      <DiwanSection id="edition" title={tw("editionTitle")}>
        <p className="max-w-3xl text-text-secondary">{tw("editionLede")}</p>
        {calls.data ? null : <SectionSpinner />}
        {openCalls.map((call) => (
          <p className="type-body" key={call.id}>
            {tw("callCloses", {
              call: localized(call, "title", locale),
              date: formatLongDate(call.closes_at, locale, true),
              max: formatNumber(call.max_per_person),
            })}
          </p>
        ))}
        {openCalls.length > 0 ? (
          <DeskList desks={journal.editionDesks} />
        ) : (
          <NextCall />
        )}
      </DiwanSection>
      <DiwanSection id="mine" title={tw("yourWork")}>
        {submissions.data && pieces.data ? (
          <DataTable
            columns={columns}
            empty={t("noSubmissions")}
            rowKey={(row) => row.id}
            rows={sent}
          />
        ) : (
          <SectionSpinner />
        )}
      </DiwanSection>
    </div>
  );
};

/** The desks behind a door, each with the types a member sends. */
const DeskList = ({ desks }: { desks: readonly journal.Desk[] }) => {
  const tw = useTranslations("nexus.journal.write");
  const tn = useTranslations("nexus.waraq");
  const tj = useTranslations("nexus.admin.journal");
  return (
    <ul className="grid divide-y divide-line border-line border-y">
      {desks.map((desk) => (
        <li className="grid gap-3 py-5 md:grid-cols-[12rem_1fr]" key={desk}>
          <h3 className="type-heading">{tj(`desks.${desk}`)}</h3>
          <div className="grid gap-2">
            <p className="type-body">
              {journal.isEditionDesk(desk)
                ? tw(`deskLines.${desk as "letters"}`)
                : tn(`deskLines.${desk as "news"}`)}
            </p>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
              {journal.sendableCategories(desk).map((category) => (
                <li key={category}>
                  <Link
                    className="link font-medium text-sm"
                    href={{
                      pathname: "/qirtas/write",
                      query: { type: category },
                    }}
                  >
                    {tj(`categories.${category}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </li>
      ))}
    </ul>
  );
};

/**
 * No call is open: when the next one opens (if announced), and "Tell me
 * when", an email the day it opens.
 */
const NextCall = () => {
  const tw = useTranslations("nexus.journal.write");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const next = useQuery({
    queryFn: () => journal.nextCall(supabase),
    queryKey: ["journal", "next-call"],
  });
  const alert = useQuery({
    queryFn: () => journal.hasCallAlert(supabase),
    queryKey: ["journal", "call-alert"],
  });
  const toggle = useMutation({
    mutationFn: (on: boolean) => journal.setCallAlert(supabase, on),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["journal", "call-alert"] }),
  });
  return (
    <div className="grid gap-3">
      <p className="type-body">
        {next.data
          ? tw("nextCall", {
              call: localized(next.data, "title", locale),
              date: formatLongDate(next.data.opens_at, locale, true),
            })
          : tw("noCall")}
      </p>
      {alert.data ? (
        <p className="type-caption" role="status">
          {tw("alertOn")}{" "}
          <button
            className="link"
            disabled={toggle.isPending}
            onClick={() => toggle.mutate(false)}
            type="button"
          >
            {tw("alertOff")}
          </button>
        </p>
      ) : (
        <Button
          className="justify-self-start"
          disabled={toggle.isPending || alert.isPending}
          onClick={() => toggle.mutate(true)}
          variant="outline"
        >
          {tw("tellMe")}
        </Button>
      )}
      <ErrorLine error={toggle.error} />
    </div>
  );
};

// ── Submit ────────────────────────────────────────────────────────────────

/** A type that answers an Edition call (Letters and Gallery). */
const isEditionType = (value: string | null): value is journal.Category =>
  (journal.categories as readonly string[]).includes(value ?? "") &&
  journal.isEditionDesk(journal.deskOf(value as journal.Category));

type OpenCall = NonNullable<ReturnType<typeof useOpenCalls>["data"]>[number];
type Pathway = Awaited<ReturnType<typeof journal.myCallPathways>>[number];

/**
 * The partner pathway: Society members answer any open call; people
 * verified as a partner's members answer only the calls opened to that
 * partner, and always through it.
 */
const useSubmitPathway = (
  calls: OpenCall[] | null | undefined,
  callId: string,
  partnerId: string
) => {
  const { supabase } = useAuth();
  const status = useMemberStatus();
  const pathways = useQuery({
    queryFn: () => journal.myCallPathways(supabase),
    queryKey: ["journal", "pathways"],
  });
  const isMember = Boolean(status.data?.is_member);
  const callable = (calls ?? []).filter(
    (c) => isMember || pathways.data?.some((p) => p.call_id === c.id)
  );
  const call = callable.find((c) => c.id === callId) ?? callable[0];
  const callPathways = (pathways.data ?? []).filter(
    (p) => p.call_id === call?.id
  );
  const chosen = callPathways.find((p) => p.partner_id === partnerId);
  const throughPartner = isMember
    ? chosen?.partner_id
    : (chosen ?? callPathways[0])?.partner_id;
  return {
    call,
    callable,
    callPathways,
    isMember,
    pending: pathways.isPending || status.isPending,
    throughPartner,
  };
};

const PartnerPathway = ({
  isMember,
  onChange,
  pathways,
  value,
}: {
  isMember: boolean;
  onChange: (partnerId: string) => void;
  pathways: Pathway[];
  value: string | undefined;
}) => {
  const t = useTranslations("nexus.journal");
  const locale = useLocale();
  if (pathways.length === 0) {
    return null;
  }
  return (
    <Field
      hint={isMember ? t("throughPartnerOptional") : t("throughPartnerHint")}
      label={t("throughPartner")}
    >
      {(id) => (
        <SelectInput
          id={id}
          onChange={(e) => onChange(e.target.value)}
          value={value ?? ""}
        >
          {isMember ? <option value="">{t("asMember")}</option> : null}
          {pathways.map((p) => (
            <option key={p.partner_id} value={p.partner_id}>
              {localized(p, "name", locale)}
            </option>
          ))}
        </SelectInput>
      )}
    </Field>
  );
};

export const SubmitWork = () => {
  const t = useTranslations("nexus.journal");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { supabase } = useAuth();
  const invalidate = useInvalidate();
  const calls = useOpenCalls();
  const requestedCall = useQueryParam("call");
  const requestedType = useQueryParam("type");
  const [callId, setCallId] = useState(requestedCall ?? "");
  const [work, setWork] = useState<WorkValue>(() =>
    isEditionType(requestedType)
      ? { ...blankWork, category: requestedType }
      : blankWork
  );
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [pledged, setPledged] = useState(false);
  const [firstPublication, setFirstPublication] = useState(false);
  const [consent, setConsent] = useState(false);
  const [partial, setPartial] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState("");
  const pathway = useSubmitPathway(calls.data, callId, partnerId);
  const { call, callable, callPathways, isMember, throughPartner } = pathway;
  const kinds = kindsFor(work.category);

  const send = useMutation({
    mutationFn: async () => {
      const created = await journal.createSubmission(supabase, {
        body_html: work.body_html || undefined,
        call_id: call?.id ?? "",
        category: work.category,
        consent_confirmed: consent,
        cover_note: work.cover_note || undefined,
        first_publication_confirmed: firstPublication,
        human_authorship_confirmed: true,
        language: work.language,
        partner_id: throughPartner,
        pen_name: work.pen_name.trim() || undefined,
        rights_note: work.rights_note || undefined,
        source_author: work.source_author || undefined,
        source_text: work.source_text || undefined,
        title: work.title.trim(),
      });
      if (!created) {
        throw new Error("not_created");
      }
      const results = await Promise.allSettled(
        files
          .filter((f) => kinds.includes(f.kind))
          .map((f) => attachFile(supabase, created.id, f))
      );
      if (results.some((r) => r.status === "rejected")) {
        setPartial(created.id);
        return null;
      }
      return created.id;
    },
    onSuccess: async (id) => {
      await invalidate();
      if (id) {
        router.push({ pathname: "/qirtas/submission", query: { id } });
      }
    },
  });

  if (!calls.data || pathway.pending) {
    return <SectionSpinner />;
  }
  const submit = (event: FormEvent) => {
    event.preventDefault();
    send.mutate();
  };
  const ready =
    Boolean(call) &&
    pledged &&
    firstPublication &&
    (journal.deskOf(work.category) !== "gallery" || consent) &&
    workIsReady(work, files.filter((f) => kinds.includes(f.kind)).length);

  return (
    <div className="grid gap-8">
      <AdminHeading
        actions={
          <Link
            className="text-sm underline underline-offset-4"
            href="/qirtas/write"
          >
            {t("back")}
          </Link>
        }
        title={t("submitTitle")}
      >
        {t("submitLede")}
      </AdminHeading>
      {call ? null : <p>{t("noCall")}</p>}
      {call ? (
        <form className="grid max-w-3xl gap-6" onSubmit={submit}>
          <Field label={t("call")}>
            {(id) => (
              <SelectInput
                id={id}
                onChange={(e) => setCallId(e.target.value)}
                value={call.id}
              >
                {callable.map((c) => (
                  <option key={c.id} value={c.id}>
                    {localized(c, "title", locale)}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
          <PartnerPathway
            isMember={isMember}
            onChange={setPartnerId}
            pathways={callPathways}
            value={throughPartner}
          />
          <WorkFields onChange={setWork} value={work} />
          <fieldset className="grid gap-3">
            <legend className="mb-2 font-medium">{t("files.title")}</legend>
            <p className="type-caption">{t("files.note")}</p>
            <FilePicker
              kinds={kinds}
              onAdd={(added) => setFiles((current) => [...current, ...added])}
            />
            <PendingList
              files={files.filter((f) => kinds.includes(f.kind))}
              onRemove={(index) =>
                setFiles((current) =>
                  current
                    .filter((f) => kinds.includes(f.kind))
                    .filter((_, i) => i !== index)
                )
              }
            />
          </fieldset>
          <Declarations
            category={work.category}
            consent={consent}
            firstPublication={firstPublication}
            onConsent={setConsent}
            onFirstPublication={setFirstPublication}
          />
          <AuthorshipPledge checked={pledged} onChange={setPledged} />
          <p className="type-caption">
            {t("limits", {
              hour: formatNumber(journal.MAX_SUBMISSIONS_PER_HOUR),
              max: formatNumber(call.max_per_person),
            })}
          </p>
          <Button
            className="justify-self-start"
            disabled={!ready || send.isPending}
            type="submit"
          >
            {send.isPending ? t("sending") : t("send")}
          </Button>
          <ErrorLine error={send.error} />
          {partial ? (
            <p className="text-sm text-text" role="alert">
              {t("filesFailed")}{" "}
              <Link
                className="link"
                href={{
                  pathname: "/qirtas/submission",
                  query: { id: partial },
                }}
              >
                {t("openSubmission")}
              </Link>
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
};

// ── One submission ──────────────────────────────────────────────────────────

/** Accepted work becomes a piece the author follows to publication. */
const PieceLink = ({ submissionId }: { submissionId: string }) => {
  const t = useTranslations("nexus.waraq");
  const { supabase } = useAuth();
  const piece = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("pieces")
          .select("id")
          .eq("submission_id", submissionId)
          .maybeSingle()
      ),
    queryKey: ["journal", "piece-of", submissionId],
  });
  if (!piece.data) {
    return null;
  }
  return (
    <Link
      className={buttonLink}
      href={{ pathname: "/qirtas/work", query: { id: piece.data.id } }}
    >
      {t("openYourPiece")}
    </Link>
  );
};

export const Agreement = ({ submissionId }: { submissionId: string }) => {
  const t = useTranslations("nexus.journal.agreement");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const agreement = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("agreements")
          .select("signed_at, signer_name, version")
          .eq("submission_id", submissionId)
          .maybeSingle()
      ),
    queryKey: ["agreement", submissionId],
  });
  const sign = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase.schema("journal").rpc("sign_agreement", {
          signer_name: name.trim(),
          submission_id: submissionId,
        })
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["agreement", submissionId] }),
  });

  if (agreement.isPending) {
    return <SectionSpinner />;
  }
  return (
    <section className="grid max-w-3xl gap-3 border-line border-t p-4">
      <h2 className="type-subheading">{t("title")}</h2>
      {agreement.data ? (
        <p>
          {t("signed", {
            date: formatLongDate(agreement.data.signed_at, locale),
            name: agreement.data.signer_name,
          })}
        </p>
      ) : (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            sign.mutate();
          }}
        >
          <p className="whitespace-pre-wrap">{t("body")}</p>
          <Field hint={t("nameHint")} label={t("name")}>
            {(id) => (
              <Input
                autoComplete="name"
                id={id}
                maxLength={200}
                onChange={(e) => setName(e.target.value)}
                value={name}
              />
            )}
          </Field>
          <Button
            className="justify-self-start"
            disabled={name.trim().length < 2 || sign.isPending}
            type="submit"
          >
            {t("sign")}
          </Button>
          <ErrorLine error={sign.error} />
        </form>
      )}
    </section>
  );
};

export const MySubmission = () => {
  const t = useTranslations("nexus.journal");
  const tj = useTranslations("nexus.admin.journal");
  const id = useQueryParam("id");
  const { supabase } = useAuth();
  const invalidate = useInvalidate();
  const [work, setWork] = useState<WorkValue>(blankWork);
  const [adding, setAdding] = useState<PendingFile[]>([]);

  const data = useQuery({
    enabled: Boolean(id),
    queryFn: async () => {
      const [row, files, history] = await Promise.all([
        supabase
          .schema("journal")
          .from("submissions")
          .select("*")
          .eq("id", id ?? "")
          .maybeSingle(),
        supabase
          .schema("journal")
          .from("submission_files")
          .select("id, kind, mime_type, storage_path, created_at")
          .eq("submission_id", id ?? "")
          .order("created_at"),
        supabase
          .schema("journal")
          .from("status_history")
          .select("id, to_status, changed_at")
          .eq("submission_id", id ?? "")
          .order("changed_at"),
      ]);
      return {
        files: unwrap(files) ?? [],
        history: unwrap(history) ?? [],
        row: unwrap(row),
      };
    },
    queryKey: ["submission", id],
  });
  const row = data.data?.row;

  useEffect(() => {
    if (row) {
      setWork({
        body_html: row.body_html ?? "",
        category: row.category,
        cover_note: row.cover_note ?? "",
        language: row.language,
        pen_name: row.pen_name ?? "",
        rights_note: row.rights_note ?? "",
        source_author: row.source_author ?? "",
        source_text: row.source_text ?? "",
        title: row.title,
      });
    }
  }, [row]);

  const refresh = async () => {
    await data.refetch();
    await invalidate();
  };
  const save = useMutation({
    mutationFn: async () => {
      unwrap(
        await supabase
          .schema("journal")
          .from("submissions")
          .update(revisableColumns(work))
          .eq("id", id ?? "")
      );
      await Promise.all(adding.map((f) => attachFile(supabase, id ?? "", f)));
    },
    onSuccess: async () => {
      setAdding([]);
      await refresh();
    },
  });
  const removeFile = useMutation({
    mutationFn: (file: { id: string; storage_path: string }) =>
      detachFile(supabase, file),
    onSuccess: refresh,
  });
  const withdraw = useMutation({
    mutationFn: () => journal.transition(supabase, id ?? "", "withdrawn"),
    onSuccess: refresh,
  });

  const back = (
    <Link className="text-sm underline underline-offset-4" href="/qirtas/write">
      {t("back")}
    </Link>
  );
  if (data.isPending && id) {
    return <SectionSpinner />;
  }
  if (!row) {
    return (
      <div className="grid gap-4">
        <AdminHeading actions={back} title={t("submissionTitle")} />
        <p>{t("notFound")}</p>
      </div>
    );
  }
  const editable =
    row.status === "received" ||
    (row.status === "intake_check" && row.intake_returned_at !== null);
  const kinds = kindsFor(row.category);
  const fileCount = (data.data?.files.length ?? 0) + adding.length;

  return (
    <div className="grid gap-8">
      <AdminHeading actions={back} title={row.title}>
        {tj(`categories.${row.category}`)} · {t(`status.${row.status}`)}
      </AdminHeading>

      {row.status === "intake_check" && row.intake_returned_at ? (
        <section className="grid gap-2 border-line border-t p-4" role="status">
          <h2 className="font-medium">{t("returnedTitle")}</h2>
          <p className="whitespace-pre-wrap">{row.intake_note}</p>
          <p className="type-caption">{t("returnedHint")}</p>
        </section>
      ) : null}

      {row.status === "accepted" ? <Agreement submissionId={row.id} /> : null}
      {row.status === "accepted" ? <PieceLink submissionId={row.id} /> : null}

      <ReadingTimeline history={data.data?.history ?? []} status={row.status} />

      <DiwanSection id="files-title" title={t("files.title")}>
        {data.data?.files.length ? (
          <ul className="grid gap-1">
            {data.data.files.map((f, index) => (
              <li className="flex flex-wrap items-center gap-3" key={f.id}>
                <span className="text-sm">
                  {t(
                    `files.kinds.${f.kind as "manuscript" | "image" | "source"}`
                  )}{" "}
                  {formatNumber(index + 1)}
                </span>
                {editable ? (
                  <Button
                    disabled={removeFile.isPending}
                    onClick={() => removeFile.mutate(f)}
                    size="sm"
                    variant="ghost"
                  >
                    {t("files.remove")}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="type-caption">{t("files.none")}</p>
        )}
        <ErrorLine error={removeFile.error} />
      </DiwanSection>

      {editable ? (
        <form
          className="grid max-w-3xl gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <h2 className="type-subheading">{t("revise")}</h2>
          <WorkFields fixedKind onChange={setWork} value={work} />
          <FilePicker
            kinds={kinds}
            onAdd={(added) => setAdding((current) => [...current, ...added])}
          />
          <PendingList
            files={adding}
            onRemove={(index) =>
              setAdding((current) => current.filter((_, i) => i !== index))
            }
          />
          <SaveButton
            disabled={!workIsReady(work, fileCount)}
            pending={save.isPending}
            success={save.isSuccess}
          />
          <ErrorLine error={save.error} />
        </form>
      ) : null}

      {FINAL.includes(row.status) ? null : (
        <DiwanSection id="withdrawtitle" title={t("withdrawTitle")}>
          <p className="type-caption">{t("withdrawNote")}</p>
          <div>
            <ConfirmAction
              confirmLabel={t("withdraw")}
              description={t("withdrawConfirm")}
              disabled={withdraw.isPending}
              onConfirm={() => withdraw.mutate()}
            >
              {t("withdraw")}
            </ConfirmAction>
          </div>
          <ErrorLine error={withdraw.error} />
        </DiwanSection>
      )}
    </div>
  );
};

const STAGES = [
  "received",
  "intake_check",
  "in_review",
  "selection",
  "decision",
] as const;

const stageOf = (status: string): (typeof STAGES)[number] => {
  if (status === "third_read") {
    return "in_review";
  }
  if (
    status === "accepted" ||
    status === "declined" ||
    status === "withdrawn"
  ) {
    return "decision";
  }
  return (STAGES as readonly string[]).includes(status)
    ? (status as (typeof STAGES)[number])
    : "received";
};

/**
 * Where a submission stands in the reading, stage by stage, with what each
 * stage means. Names never appear: readers work from blind ids.
 */
const ReadingTimeline = ({
  history,
  status,
}: {
  readonly history: { changed_at: string; id: number; to_status: string }[];
  readonly status: string;
}) => {
  const t = useTranslations("nexus.journal");
  const locale = useLocale() as Locale;
  const current = STAGES.indexOf(stageOf(status));
  const reachedAt = (stage: (typeof STAGES)[number]) =>
    history.find((h) => stageOf(h.to_status) === stage)?.changed_at;

  return (
    <section aria-labelledby="timeline" className="grid gap-3">
      <h2 className="type-subheading" id="timeline">
        {t("progress")}
      </h2>
      <ol className="grid">
        {STAGES.map((stage, index) => {
          let state: "done" | "current" | "next" = "next";
          if (index < current) {
            state = "done";
          } else if (index === current) {
            state = "current";
          }
          const at = reachedAt(stage);
          return (
            <li
              aria-current={state === "current" ? "step" : undefined}
              className="grid grid-cols-[1.5rem_1fr] gap-3 border-line border-b py-3"
              key={stage}
            >
              <span
                aria-hidden="true"
                className={
                  state === "next"
                    ? "mt-1 size-4 border border-line"
                    : "mt-1 size-4 border border-line bg-band"
                }
              />
              <div className="grid gap-1">
                <p
                  className={
                    state === "next" ? "text-text-secondary" : "font-medium"
                  }
                >
                  {stage === "decision" && index <= current
                    ? t(`status.${status as "accepted"}`)
                    : t(`timeline.${stage}.title`)}
                  {at ? (
                    <span className="type-caption ms-2 font-normal">
                      {formatLongDate(at, locale)}
                    </span>
                  ) : null}
                </p>
                <p className="type-caption">{t(`timeline.${stage}.body`)}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="type-caption">{t("blindNote")}</p>
    </section>
  );
};
