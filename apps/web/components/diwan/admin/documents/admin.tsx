"use client";

import { useAuth } from "@repo/auth/provider";
import { Input } from "@repo/brand/components/ui/input";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { documents, sanitizeRichText, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { DateInput } from "@/components/fields/date-input";
import { Link, useRouter } from "@/lib/diwan/navigation";
import { OnTheSite } from "../../site-links";
import { SectionSpinner } from "../../states";
import {
  AdminHeading,
  type Column,
  DataTable,
  ErrorLine,
  Field,
  SaveButton,
  SelectInput,
} from "../kit";
import { NotionManaged } from "../notion-managed";

const key = ["admin", "society-documents"];
const LIBRARY = "/council/library";

type Status = documents.DocumentStatus;
type Doc = documents.SalDocument;

const useDocumentList = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: () => documents.allDocuments(supabase),
    queryKey: key,
  });
};

/**
 * The Library (decisions.md): the Society's documents on two
 * shelves, the Society's documents and the website's policies. Since Nov 4,
 * 2026 their text is written in Notion and published from there; the
 * Diwan keeps each one's adoption record, kept by whoever holds
 * governance.manage (the President, the Vice President and the General
 * Secretary). Internal documents stay in Notion.
 */
export const LibraryAdmin = () => {
  const t = useTranslations("diwan.admin.documents");
  const locale = useLocale() as Locale;
  const list = useDocumentList();

  const columns: Column<Doc>[] = [
    {
      cell: (d) => (
        <Link className="link" href={`${LIBRARY}/${d.slug}`}>
          {documents.documentTitle(d, locale)}
        </Link>
      ),
      header: t("columns.title"),
      key: "title",
    },
    { cell: (d) => d.code, header: t("columns.code"), key: "code" },
    {
      cell: (d) => t(`statuses.${d.status as Status}`),
      header: t("columns.status"),
      key: "status",
    },
    {
      cell: (d) => formatLongDate(d.updated_at, locale, true),
      className: "whitespace-nowrap",
      header: t("columns.updated"),
      key: "updated",
    },
  ];

  return (
    <div className="grid gap-8">
      <AdminHeading actions={<OnTheSite href="/library" />} title={t("title")}>
        {t("lede")}
      </AdminHeading>
      {list.isPending ? <SectionSpinner /> : null}
      {(["society", "policies"] as const).map((shelf) => (
        <DataTable
          caption={t(`shelves.${shelf}`)}
          columns={columns}
          empty={t("empty")}
          key={shelf}
          rowKey={(d) => d.id}
          rows={(list.data ?? []).filter(
            (d) => documents.isWebsitePolicy(d) === (shelf === "policies")
          )}
        />
      ))}
    </div>
  );
};

const optionalDate = (value: string) => value || null;

type FullDoc = Doc & { body_ar: string | null; body_en: string };

/**
 * One document on its own page, `/council/library/<slug>`: its adoption
 * record, and its text as Notion has it. New documents are written in
 * Notion (Publishing, Documents) since Nov 4, 2026. Saving returns to the
 * Library.
 */
export const LibraryDocument = ({ slug }: { slug: string }) => {
  const t = useTranslations("diwan.admin.documents");
  const { supabase } = useAuth();
  const full = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("society_documents")
          .select("*")
          .eq("slug", slug)
          .maybeSingle()
      ) as FullDoc | null,
    queryKey: [...key, "slug", slug],
  });

  if (full.isPending) {
    return <SectionSpinner />;
  }
  if (!full.data) {
    return (
      <div className="grid gap-4">
        <AdminHeading title={t("missing")} />
        <ErrorLine error={full.error} />
        <Link className="link justify-self-start" href={LIBRARY}>
          {t("back")}
        </Link>
      </div>
    );
  }
  return (
    <div className="grid gap-6">
      <NotionManaged kind="document" recordId={full.data.id} />
      <EditorForm doc={full.data} key={full.data.id} t={t} />
    </div>
  );
};

/**
 * A document's adoption record (decisions.md): the text is written in
 * Notion (Publishing, Documents) and rendered here and on the Library by the
 * sync, read-only; the Diwan keeps when and how it was adopted (status,
 * version, the date and the vote), which goes back to the row in Notion.
 */
const EditorForm = ({
  doc,
  t,
}: {
  doc: FullDoc;
  t: ReturnType<typeof useTranslations<"diwan.admin.documents">>;
}) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [form, setForm] = useState({
    adopted_on: doc.adopted_on ?? "",
    status: doc.status as Status,
    version: doc.version ?? "",
    vote: doc.vote ?? "",
  });
  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("society_documents")
          .update({
            adopted_on: optionalDate(form.adopted_on),
            status: form.status,
            version: form.version.trim() || null,
            vote: form.vote.trim() || null,
          })
          .eq("id", doc.id)
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key });
      router.push(LIBRARY);
    },
  });
  const adoptedWithoutDate = form.status === "adopted" && !form.adopted_on;

  return (
    <form
      className="grid max-w-4xl gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <AdminHeading
        actions={
          <>
            <Link className="link" href={LIBRARY}>
              {t("back")}
            </Link>
            <OnTheSite href={documents.documentPath(doc.slug)} />
          </>
        }
        title={doc.title_en}
      >
        {doc.code}
      </AdminHeading>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("fields.status")}>
          {(fieldId) => (
            <SelectInput
              id={fieldId}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as Status }))
              }
              value={form.status}
            >
              {documents.documentStatuses.map((s) => (
                <option key={s} value={s}>
                  {t(`statuses.${s}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label={t("fields.version")}>
          {(fieldId) => (
            <Input
              id={fieldId}
              maxLength={60}
              onChange={(e) =>
                setForm((f) => ({ ...f, version: e.target.value }))
              }
              value={form.version}
            />
          )}
        </Field>
        <Field hint={t("fields.adoptedHint")} label={t("fields.adopted")}>
          {(fieldId) => (
            <DateInput
              id={fieldId}
              onChange={(e) =>
                setForm((f) => ({ ...f, adopted_on: e.target.value }))
              }
              value={form.adopted_on}
            />
          )}
        </Field>
      </div>
      <Field hint={t("fields.voteHint")} label={t("fields.vote")}>
        {(fieldId) => (
          <Input
            id={fieldId}
            maxLength={300}
            onChange={(e) => setForm((f) => ({ ...f, vote: e.target.value }))}
            value={form.vote}
          />
        )}
      </Field>
      {adoptedWithoutDate ? (
        <p className="type-caption">{t("adoptedNoDate")}</p>
      ) : null}
      <SaveButton pending={save.isPending} success={save.isSuccess} />
      <ErrorLine error={save.error} />
      <section aria-labelledby="document-text" className="grid gap-3">
        <h2 className="type-heading" id="document-text">
          {t("textTitle")}
        </h2>
        <p className="type-caption">{t("textFromNotion")}</p>
        <div
          className="prose max-w-none border-line border-t pt-space-4"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: rendered from Notion and sanitized by the sync
          dangerouslySetInnerHTML={{ __html: sanitizeRichText(doc.body_en) }}
        />
      </section>
    </form>
  );
};
