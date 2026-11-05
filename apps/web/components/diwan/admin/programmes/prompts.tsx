"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { RowList } from "../../page";
import { EmptyLine, SectionSpinner } from "../../states";
import {
  AddInPlace,
  BilingualField,
  ConfirmAction,
  ErrorLine,
  SaveButton,
} from "../kit";

const key = (eventId: string) => ["admin", "prompts", eventId];

/** A new prompt, written in place under the list. */
const NewPrompt = ({
  onDone,
  eventId,
}: {
  readonly onDone: () => void;
  readonly eventId: string;
}) => {
  const t = useTranslations("diwan.admin.programmes.prompts");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState({ ar: "", en: "" });
  const add = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase.schema("programmes").from("prompts").insert({
          event_id: eventId,
          text_ar: text.ar.trim(),
          text_en: text.en.trim(),
        })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key(eventId) });
      onDone();
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    add.mutate();
  };
  return (
    <form className="grid gap-4" onSubmit={submit}>
      <BilingualField
        label={t("text")}
        maxLength={300}
        multiline
        onChange={setText}
        rows={2}
        value={text}
      />
      <SaveButton
        disabled={!(text.en.trim() || text.ar.trim())}
        pending={add.isPending}
      />
      <ErrorLine error={add.error} />
    </form>
  );
};

/**
 * Open Pages' prompt cards (the design review A35, Nov 4, 2026): the host
 * writes them here and publishes the ones the event's page should show.
 */
export const Prompts = ({ eventId }: { readonly eventId: string }) => {
  const t = useTranslations("diwan.admin.programmes.prompts");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const prompts = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("prompts")
          .select("id, text_en, text_ar, is_published")
          .eq("event_id", eventId)
          .order("created_at", { ascending: false })
      ) ?? [],
    queryKey: key(eventId),
  });
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: key(eventId) });
  const publish = useMutation({
    mutationFn: async ({ id, on }: { id: string; on: boolean }) =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("prompts")
          .update({ is_published: on })
          .eq("id", id)
      ),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: async (id: string) =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("prompts")
          .delete()
          .eq("id", id)
      ),
    onSuccess: refresh,
  });

  return (
    <div className="grid max-w-3xl gap-6">
      <p className="type-body text-text-secondary">{t("lede")}</p>
      {prompts.isPending ? <SectionSpinner /> : null}
      {prompts.data?.length === 0 ? <EmptyLine>{t("empty")}</EmptyLine> : null}
      {prompts.data?.length ? (
        <RowList>
          {prompts.data.map((prompt) => (
            <li
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2"
              key={prompt.id}
            >
              <span className="grid gap-0.5">
                <span className="type-body">
                  {localized(prompt, "text", locale) ||
                    prompt.text_en ||
                    prompt.text_ar}
                </span>
                <span className="type-caption text-text-secondary">
                  {prompt.is_published ? t("published") : t("notPublished")}
                </span>
              </span>
              <span className="flex flex-wrap gap-2">
                <Button
                  disabled={publish.isPending}
                  onClick={() =>
                    publish.mutate({
                      id: prompt.id,
                      on: !prompt.is_published,
                    })
                  }
                  size="sm"
                  variant="ghost"
                >
                  {prompt.is_published ? t("unpublish") : t("publish")}
                </Button>
                <ConfirmAction
                  confirmLabel={t("remove")}
                  description={t("removeConfirm")}
                  disabled={remove.isPending}
                  onConfirm={() => remove.mutate(prompt.id)}
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
        {(close) => <NewPrompt eventId={eventId} onDone={close} />}
      </AddInPlace>
      <ErrorLine error={publish.error ?? remove.error} />
    </div>
  );
};
