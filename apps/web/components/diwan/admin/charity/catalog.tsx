"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { charity, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { DiwanSection, RowList } from "../../page";
import {
  AddInPlace,
  ConfirmAction,
  ErrorLine,
  Field,
  SaveButton,
  SelectInput,
} from "../kit";

const key = (campaignId: string) => ["admin", "charity", "catalog", campaignId];

const NewBook = ({
  campaignId,
  onDone,
}: {
  readonly campaignId: string;
  readonly onDone: () => void;
}) => {
  const t = useTranslations("diwan.admin.charity.catalog");
  const tl = useTranslations("web.give.catalog.language");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    author: "",
    copies: "1",
    language: "ar" as charity.CatalogLanguage,
    note: "",
    title: "",
  });
  const add = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("charity")
          .from("catalog_books")
          .insert({
            author: form.author.trim() || null,
            campaign_id: campaignId,
            copies: Math.min(99, Math.max(1, Number(form.copies) || 1)),
            language: form.language,
            note: form.note.trim() || null,
            title: form.title.trim(),
          })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key(campaignId) });
      onDone();
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    add.mutate();
  };
  return (
    <form className="grid gap-4" onSubmit={submit}>
      <Field label={t("bookTitle")}>
        {(id) => (
          <Input
            dir="auto"
            id={id}
            maxLength={200}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            value={form.title}
          />
        )}
      </Field>
      <Field label={t("author")}>
        {(id) => (
          <Input
            dir="auto"
            id={id}
            maxLength={200}
            onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
            value={form.author}
          />
        )}
      </Field>
      <Field label={t("language")}>
        {(id) => (
          <SelectInput
            id={id}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                language: e.target.value as charity.CatalogLanguage,
              }))
            }
            value={form.language}
          >
            {charity.CATALOG_LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {tl(l)}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>
      <Field label={t("copies")}>
        {(id) => (
          <Input
            className="w-28"
            dir="ltr"
            id={id}
            inputMode="numeric"
            max={99}
            min={1}
            onChange={(e) => setForm((f) => ({ ...f, copies: e.target.value }))}
            type="number"
            value={form.copies}
          />
        )}
      </Field>
      <Field hint={t("noteHint")} label={t("note")}>
        {(id) => (
          <Input
            dir="auto"
            id={id}
            maxLength={300}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            value={form.note}
          />
        )}
      </Field>
      <SaveButton disabled={!form.title.trim()} pending={add.isPending} />
      <ErrorLine error={add.error} />
    </form>
  );
};

/**
 * The campaign's catalog (the design review A27): the books given for its
 * fair, listed for readers to browse on Second Chapter's page. No prices.
 */
export const CampaignCatalog = ({
  campaignId,
}: {
  readonly campaignId: string;
}) => {
  const t = useTranslations("diwan.admin.charity.catalog");
  const tl = useTranslations("web.give.catalog.language");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const books = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("charity")
          .from("catalog_books")
          .select("id, title, author, language, copies, is_listed")
          .eq("campaign_id", campaignId)
          .order("title")
      ) ?? [],
    queryKey: key(campaignId),
  });
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: key(campaignId) });
  const toggle = useMutation({
    mutationFn: async ({ id, listed }: { id: string; listed: boolean }) =>
      unwrap(
        await supabase
          .schema("charity")
          .from("catalog_books")
          .update({ is_listed: listed })
          .eq("id", id)
      ),
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: async (id: string) =>
      unwrap(
        await supabase
          .schema("charity")
          .from("catalog_books")
          .delete()
          .eq("id", id)
      ),
    onSettled: refresh,
  });
  return (
    <DiwanSection id="catalog" title={t("title")}>
      <p className="type-body text-text-secondary">{t("lede")}</p>
      {books.data?.length ? (
        <RowList>
          {books.data.map((book) => (
            <li
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
              key={book.id}
            >
              <span className="grid gap-0.5">
                <span className="type-body" dir="auto">
                  {book.title}
                </span>
                <span className="type-caption text-text-secondary">
                  {[
                    book.author,
                    tl(book.language as charity.CatalogLanguage),
                    book.copies > 1
                      ? t("copiesCount", { count: String(book.copies) })
                      : null,
                    book.is_listed ? null : t("unlisted"),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <span className="flex gap-2">
                <Button
                  disabled={toggle.isPending}
                  onClick={() =>
                    toggle.mutate({ id: book.id, listed: !book.is_listed })
                  }
                  size="sm"
                  variant="ghost"
                >
                  {book.is_listed ? t("unlist") : t("list")}
                </Button>
                <ConfirmAction
                  confirmLabel={t("remove")}
                  description={t("removeConfirm")}
                  disabled={remove.isPending}
                  onConfirm={() => remove.mutate(book.id)}
                  variant="ghost"
                >
                  {t("remove")}
                </ConfirmAction>
              </span>
            </li>
          ))}
        </RowList>
      ) : null}
      <AddInPlace label={t("new")}>
        {(close) => <NewBook campaignId={campaignId} onDone={close} />}
      </AddInPlace>
      <ErrorLine error={toggle.error ?? remove.error} />
    </DiwanSection>
  );
};
