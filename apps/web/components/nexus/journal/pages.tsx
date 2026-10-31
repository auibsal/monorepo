"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import {
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { journal, localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { MySignature } from "@/components/signature";
import {
  queryKeys,
  useMemberStatus,
  useMySubmissions,
  type useOpenCalls,
  useProfile,
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
  blankWork,
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
  href: string;
  id: string;
  status: string;
  title: string;
  type: string;
}

/**
 * Your work (/membership/work): everything a member has sent to Qirtas,
 * Edition submissions and newsroom pieces alike, newest first, each with
 * where it stands and its own page.
 */
export const YourWork = () => {
  const t = useTranslations("nexus.journal");
  const tw = useTranslations("nexus.journal.write");
  const tn = useTranslations("nexus.waraq");
  const tp = useTranslations("nexus.admin.waraq");
  const tj = useTranslations("nexus.admin.journal");
  const locale = useLocale() as Locale;
  const submissions = useMySubmissions();
  const pieces = useMyPieces();

  const sent: Sent[] = [
    ...(submissions.data ?? []).map(
      (s): Sent => ({
        date: s.created_at,
        href: `/membership/work/submissions/${s.id}`,
        id: `s-${s.id}`,
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
        href: `/membership/work/${p.id}`,
        id: `p-${p.id}`,
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
    { cell: (row) => row.status, header: t("columns.status"), key: "status" },
    {
      cell: (row) => formatLongDate(row.date, locale),
      className: "whitespace-nowrap",
      header: tw("updated"),
      key: "date",
    },
  ];

  return (
    <DiwanSection id="your-work" title={tw("yourWork")}>
      <p className="type-body text-text-secondary">{tw("yourWorkLede")}</p>
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
      <Link className="link justify-self-start" href="/qirtas/write">
        {tw("sendMore")}
      </Link>
    </DiwanSection>
  );
};

/** The address of the signed-in person's own author page. */
export const useMyAuthorPage = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      (unwrap(await supabase.schema("journal").rpc("my_author_page")) ??
        null) as string | null,
    queryKey: ["journal", "my-author-page", user?.id ?? ""],
    staleTime: Number.POSITIVE_INFINITY,
  });
};

/**
 * On an author page, the person's own work in progress: what they sent and
 * what is being edited with them, seen only by them (owner, Oct 31, 2026:
 * Your work is the author page). Everyone else sees the public page alone.
 */
export const OwnWork = ({ slug }: { readonly slug: string }) => {
  const mine = useMyAuthorPage();
  return mine.data === slug ? <YourWork /> : null;
};

/** A link to the signed-in person's own author page, where their work is. */
export const MyWorkLink = ({ className = "link" }: { className?: string }) => {
  const tw = useTranslations("nexus.journal.write");
  const mine = useMyAuthorPage();
  return mine.data ? (
    <Link className={className} href={`/qirtas/authors/${mine.data}`}>
      {tw("yourWork")}
    </Link>
  ) : null;
};

// ── Submit ────────────────────────────────────────────────────────────────

type OpenCall = NonNullable<ReturnType<typeof useOpenCalls>["data"]>[number];
type Pathway = Awaited<ReturnType<typeof journal.myCallPathways>>[number];

/**
 * The partner pathway: Society members answer any open call; people
 * verified as a partner's members answer only the calls opened to that
 * partner, and always through it.
 */
export const useSubmitPathway = (
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

export const PartnerPathway = ({
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
    <Link className={buttonLink} href={`/membership/work/${piece.data.id}`}>
      {t("openYourPiece")}
    </Link>
  );
};

export const Agreement = ({ submissionId }: { submissionId: string }) => {
  const t = useTranslations("nexus.journal.agreement");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  // A signature is the author's name on the platform, dated when signed
  // (owner, Oct 31, 2026); the database signs in that name.
  const profile = useProfile();
  const name = profile.data ? localized(profile.data, "full_name", locale) : "";
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
          signer_name: name,
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
        <>
          <p>
            {t("signed", {
              date: formatLongDate(agreement.data.signed_at, locale),
              name: name || agreement.data.signer_name,
            })}
          </p>
          <MySignature date={agreement.data.signed_at} />
        </>
      ) : (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            sign.mutate();
          }}
        >
          <p className="whitespace-pre-wrap">{t("body")}</p>
          <p className="type-caption">
            {t("signAs", {
              date: formatLongDate(new Date(), locale, true),
              name,
            })}
          </p>
          <MySignature />
          <Button
            className="justify-self-start"
            disabled={!name || sign.isPending}
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
