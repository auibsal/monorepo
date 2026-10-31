"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { type Locale, localizedPath } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { documents, sanitizeRichText, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { RichTextEditor } from "../../editor/rich-text";
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

type Status = documents.DocumentStatus;
type Doc = documents.SalDocument;

const useDocumentList = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: () => documents.allDocuments(supabase),
    queryKey: key,
  });
};

const blank = {
  code: "",
  slug: "",
  title: { ar: "", en: "" },
};

const NewDocument = ({ onDone }: { onDone: (id: string) => void }) => {
  const t = useTranslations("nexus.admin.documents");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(blank);
  const create = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("society_documents")
          .insert({
            audience: "public",
            code: form.code.trim(),
            slug: form.slug.trim(),
            title_ar: form.title.ar.trim() || null,
            title_en: form.title.en.trim(),
          })
          .select("id")
          .single()
      ),
    onSuccess: async (row) => {
      setForm(blank);
      await queryClient.invalidateQueries({ queryKey: key });
      if (row) {
        onDone(row.id);
      }
    },
  });
  return (
    <form
      className="grid max-w-3xl gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate();
      }}
    >
      <h2 className="type-subheading">{t("newTitle")}</h2>
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
      <SaveButton pending={create.isPending} />
      <ErrorLine error={create.error} />
    </form>
  );
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
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const current = list.data?.find((d) => d.id === selected) ?? null;

  const columns: Column<Doc>[] = [
    {
      cell: (d) => (
        <Button
          className="h-auto p-0 text-start underline underline-offset-4"
          onClick={() => setSelected(d.id)}
          variant="link"
        >
          {documents.documentTitle(d, locale)}
        </Button>
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
            <a
              className="link"
              href={localizedPath(locale, "/library")}
              rel="noopener"
              target="_blank"
            >
              {t("viewPublic")}
            </a>
            <Button onClick={() => setCreating((c) => !c)} size="sm">
              {creating ? t("closeNew") : t("new")}
            </Button>
          </>
        }
        title={t("title")}
      >
        {t("lede")}
      </AdminHeading>
      {creating ? (
        <NewDocument
          onDone={(id) => {
            setCreating(false);
            setSelected(id);
          }}
        />
      ) : null}
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
      {current ? <DocumentEditor id={current.id} key={current.id} /> : null}
    </div>
  );
};

const optionalDate = (value: string) => value || null;

const DocumentEditor = ({ id }: { id: string }) => {
  const t = useTranslations("nexus.admin.documents");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const full = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("society_documents")
          .select("*")
          .eq("id", id)
          .single()
      ),
    queryKey: [...key, id],
  });

  if (full.isPending) {
    return <SectionSpinner />;
  }
  if (!full.data) {
    return <ErrorLine error={full.error} />;
  }
  return (
    <>
      <NotionManaged kind="document" recordId={id} />
      <EditorForm
        doc={full.data}
        onSaved={() => queryClient.invalidateQueries({ queryKey: key })}
        t={t}
      />
    </>
  );
};

const EditorForm = ({
  doc,
  onSaved,
  t,
}: {
  doc: Doc & { body_ar: string | null; body_en: string };
  onSaved: () => void;
  t: ReturnType<typeof useTranslations<"nexus.admin.documents">>;
}) => {
  const { supabase } = useAuth();
  const [form, setForm] = useState({
    adopted_on: doc.adopted_on ?? "",
    body: { ar: doc.body_ar ?? "", en: doc.body_en ?? "" },
    dated: doc.dated ?? "",
    ratification: doc.ratification ?? "",
    status: doc.status as Status,
    summary: { ar: doc.summary_ar ?? "", en: doc.summary_en ?? "" },
    title: { ar: doc.title_ar ?? "", en: doc.title_en },
    version: doc.version ?? "",
  });
  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("society_documents")
          .update({
            adopted_on: optionalDate(form.adopted_on),
            body_ar: form.body.ar.trim()
              ? sanitizeRichText(form.body.ar)
              : null,
            body_en: sanitizeRichText(form.body.en),
            dated: optionalDate(form.dated),
            ratification: optionalDate(form.ratification),
            status: form.status,
            summary_ar: form.summary.ar.trim() || null,
            summary_en: form.summary.en.trim() || null,
            title_ar: form.title.ar.trim() || null,
            title_en: form.title.en.trim(),
            version: form.version.trim() || null,
          })
          .eq("id", doc.id)
      ),
    onSuccess: onSaved,
  });
  const adoptedWithoutDate = form.status === "adopted" && !form.adopted_on;

  return (
    <form
      className="grid gap-5 border-line border-t pt-6"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <h2 className="type-heading">
        {doc.code} · {doc.title_en}
      </h2>
      <BilingualField
        label={t("fields.title")}
        maxLength={200}
        onChange={(title) => setForm((f) => ({ ...f, title }))}
        required
        value={form.title}
      />
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
            <Input
              dir="ltr"
              id={fieldId}
              onChange={(e) =>
                setForm((f) => ({ ...f, dated: e.target.value }))
              }
              type="date"
              value={form.dated}
            />
          )}
        </Field>
        <Field label={t("fields.ratification")}>
          {(fieldId) => (
            <Input
              dir="ltr"
              id={fieldId}
              onChange={(e) =>
                setForm((f) => ({ ...f, ratification: e.target.value }))
              }
              type="date"
              value={form.ratification}
            />
          )}
        </Field>
        <Field hint={t("fields.adoptedHint")} label={t("fields.adopted")}>
          {(fieldId) => (
            <Input
              dir="ltr"
              id={fieldId}
              onChange={(e) =>
                setForm((f) => ({ ...f, adopted_on: e.target.value }))
              }
              type="date"
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
