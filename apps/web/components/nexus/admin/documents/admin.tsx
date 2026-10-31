"use client";

import { useAuth } from "@repo/auth/provider";
import { Input } from "@repo/design-system/components/ui/input";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { documents, sanitizeRichText, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { DateInput } from "@/components/fields/date-input";
import { Link, useRouter } from "@/lib/nexus/navigation";
import { RichTextEditor } from "../../editor/rich-text";
import { OnTheSite } from "../../site-links";
import { SectionSpinner } from "../../states";
import {
  AdminHeading,
  BilingualField,
  type Column,
  DataTable,
  ErrorLine,
  Field,
  SaveButton,
  SelectInput,
} from "../kit";
import { NotionManaged } from "../notion-managed";

const key = ["admin", "society-documents"];
const LIBRARY = "/society/library";

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
 * The Library (owner, Oct 30, 2026): the Society's documents, managed in
 * the Diwan by whoever keeps them (governance.manage: the President, the
 * Vice President and the General Secretary) and published on the public
 * Library, auibsal.org/library, within a minute of saving, on two shelves:
 * the Society's documents and the website's policies. Internal
 * documents are kept in the team's Notion workspace, never here.
 */
export const LibraryAdmin = () => {
  const t = useTranslations("nexus.admin.documents");
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
      <AdminHeading
        actions={
          <>
            <OnTheSite href="/library" />
            <Link className="link" href={`${LIBRARY}/new`}>
              {t("new")}
            </Link>
          </>
        }
        title={t("title")}
      >
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
 * One document on its own page, `/society/library/<slug>`, or a blank one
 * at `/society/library/new` (owner, Oct 31, 2026: one flow for new: the
 * whole document, its code, address, text and dates, is written on one page
 * and created when saved). Saving returns to the Library.
 */
export const LibraryDocument = ({ slug }: { slug: string | null }) => {
  const t = useTranslations("nexus.admin.documents");
  const { supabase } = useAuth();
  const full = useQuery({
    enabled: slug !== null,
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("society_documents")
          .select("*")
          .eq("slug", slug ?? "")
          .maybeSingle()
      ) as FullDoc | null,
    queryKey: [...key, "slug", slug],
  });

  if (slug === null) {
    return <EditorForm doc={null} t={t} />;
  }
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

const EditorForm = ({
  doc,
  t,
}: {
  doc: FullDoc | null;
  t: ReturnType<typeof useTranslations<"nexus.admin.documents">>;
}) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [form, setForm] = useState({
    adopted_on: doc?.adopted_on ?? "",
    body: { ar: doc?.body_ar ?? "", en: doc?.body_en ?? "" },
    code: doc?.code ?? "",
    dated: doc?.dated ?? "",
    ratification: doc?.ratification ?? "",
    slug: doc?.slug ?? "",
    status: (doc?.status ?? "adopted") as Status,
    summary: { ar: doc?.summary_ar ?? "", en: doc?.summary_en ?? "" },
    title: { ar: doc?.title_ar ?? "", en: doc?.title_en ?? "" },
    version: doc?.version ?? "",
  });
  const save = useMutation({
    mutationFn: async () => {
      const row = {
        adopted_on: optionalDate(form.adopted_on),
        body_ar: form.body.ar.trim() ? sanitizeRichText(form.body.ar) : null,
        body_en: sanitizeRichText(form.body.en),
        dated: optionalDate(form.dated),
        ratification: optionalDate(form.ratification),
        status: form.status,
        summary_ar: form.summary.ar.trim() || null,
        summary_en: form.summary.en.trim() || null,
        title_ar: form.title.ar.trim() || null,
        title_en: form.title.en.trim(),
        version: form.version.trim() || null,
      };
      const table = supabase.schema("governance").from("society_documents");
      const named = { code: form.code.trim(), slug: form.slug.trim() };
      return unwrap(
        doc
          ? await table.update({ ...row, ...named }).eq("id", doc.id)
          : await table.insert({ ...row, ...named, audience: "public" })
      );
    },
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
            {doc ? <OnTheSite href={`/library/${doc.slug}`} /> : null}
          </>
        }
        title={doc ? doc.title_en : t("newTitle")}
      >
        {doc ? doc.code : t("newLede")}
      </AdminHeading>
      <BilingualField
        label={t("fields.title")}
        maxLength={200}
        onChange={(title) => setForm((f) => ({ ...f, title }))}
        required
        value={form.title}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field hint={t("fields.codeHint")} label={t("fields.code")}>
          {(id) => (
            <Input
              dir="ltr"
              id={id}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              pattern="SAL-[A-Z]{3}-[0-9]{2}"
              required
              value={form.code}
            />
          )}
        </Field>
        <Field hint={t("fields.slugHint")} label={t("fields.slug")}>
          {(id) => (
            <Input
              dir="ltr"
              id={id}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              required
              value={form.slug}
            />
          )}
        </Field>
      </div>
      <BilingualField
        label={t("fields.summary")}
        maxLength={600}
        multiline
        onChange={(summary) => setForm((f) => ({ ...f, summary }))}
        rows={2}
        value={form.summary}
      />
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
        <Field label={t("fields.dated")}>
          {(fieldId) => (
            <DateInput
              id={fieldId}
              onChange={(e) =>
                setForm((f) => ({ ...f, dated: e.target.value }))
              }
              value={form.dated}
            />
          )}
        </Field>
        <Field label={t("fields.ratification")}>
          {(fieldId) => (
            <DateInput
              id={fieldId}
              onChange={(e) =>
                setForm((f) => ({ ...f, ratification: e.target.value }))
              }
              value={form.ratification}
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
      {adoptedWithoutDate ? (
        <p className="type-caption">{t("adoptedNoDate")}</p>
      ) : null}
      <RichTextEditor
        document
        label={t("fields.bodyEn")}
        lang="en"
        onChange={(en) => setForm((f) => ({ ...f, body: { ...f.body, en } }))}
        value={form.body.en}
      />
      <RichTextEditor
        document
        label={t("fields.bodyAr")}
        lang="ar"
        onChange={(ar) => setForm((f) => ({ ...f, body: { ...f.body, ar } }))}
        value={form.body.ar}
      />
      <p className="type-caption">{t("publicNote")}</p>
      <SaveButton pending={save.isPending} success={save.isSuccess} />
      <ErrorLine error={save.error} />
    </form>
  );
};
