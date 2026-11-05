"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { hasPermission } from "@repo/rbac";
import { localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { useGrants } from "@/lib/diwan/queries";
import { slugify } from "../events/editor";
import {
  AddInPlace,
  BilingualField,
  ErrorLine,
  Field,
  SaveButton,
  SelectInput,
} from "../kit";

const keys = {
  all: ["admin", "journal", "topics"],
  piece: (id: string) => ["admin", "journal", "topics", id],
};

/** A new topic, named in both languages (whoever publishes Qirtas). */
const NewTopic = ({ onDone }: { readonly onDone: (id: string) => void }) => {
  const t = useTranslations("diwan.admin.qirtas.topics");
  const { supabase } = useAuth();
  const [name, setName] = useState({ ar: "", en: "" });
  const add = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("topics")
          .insert({
            name_ar: name.ar.trim(),
            name_en: name.en.trim(),
            slug: slugify(name.en),
          })
          .select("id")
          .single()
      ),
    onSuccess: (row) => onDone(row?.id ?? ""),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    add.mutate();
  };
  return (
    <form className="grid gap-4" onSubmit={submit}>
      <BilingualField
        label={t("name")}
        maxLength={60}
        onChange={setName}
        value={name}
      />
      <SaveButton
        disabled={!(name.en.trim() && name.ar.trim() && slugify(name.en))}
        pending={add.isPending}
      />
      <ErrorLine error={add.error} />
    </form>
  );
};

/**
 * The piece's topics (the design review A21): its editors tag it with the
 * topics the editors keep; each topic has its page on the site.
 */
export const PieceTopics = ({ pieceId }: { readonly pieceId: string }) => {
  const t = useTranslations("diwan.admin.qirtas.topics");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const grants = useGrants();
  const publishes = hasPermission(grants.data, "journal.publish");
  const [choice, setChoice] = useState("");
  const all = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("topics")
          .select("id, slug, name_en, name_ar")
          .order("name_en")
      ) ?? [],
    queryKey: keys.all,
  });
  const mine = useQuery({
    queryFn: async () =>
      (
        unwrap(
          await supabase
            .schema("journal")
            .from("piece_topics")
            .select("topic_id")
            .eq("piece_id", pieceId)
        ) ?? []
      ).map((r) => r.topic_id),
    queryKey: keys.piece(pieceId),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: keys.all });
  const tag = useMutation({
    mutationFn: async (topicId: string) =>
      unwrap(
        await supabase
          .schema("journal")
          .from("piece_topics")
          .insert({ piece_id: pieceId, topic_id: topicId })
      ),
    onSettled: refresh,
  });
  const untag = useMutation({
    mutationFn: async (topicId: string) =>
      unwrap(
        await supabase
          .schema("journal")
          .from("piece_topics")
          .delete()
          .eq("piece_id", pieceId)
          .eq("topic_id", topicId)
      ),
    onSettled: refresh,
  });
  const chosen = (all.data ?? []).filter((x) => mine.data?.includes(x.id));
  const others = (all.data ?? []).filter((x) => !mine.data?.includes(x.id));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (choice) {
      tag.mutate(choice);
      setChoice("");
    }
  };
  return (
    <section className="grid gap-4">
      <h2 className="type-subheading">{t("title")}</h2>
      <p className="type-body text-text-secondary">{t("lede")}</p>
      {chosen.length > 0 ? (
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {chosen.map((topic) => (
            <li className="flex items-baseline gap-2" key={topic.id}>
              <span>{localized(topic, "name", locale)}</span>
              <Button
                disabled={untag.isPending}
                onClick={() => untag.mutate(topic.id)}
                size="sm"
                variant="ghost"
              >
                {t("remove")}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="type-body">{t("none")}</p>
      )}
      {others.length > 0 ? (
        <form className="grid gap-4" onSubmit={submit}>
          <Field label={t("add")}>
            {(id) => (
              <SelectInput
                id={id}
                onChange={(e) => setChoice(e.target.value)}
                value={choice}
              >
                <option value="">{t("choose")}</option>
                {others.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {localized(topic, "name", locale)}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
          <SaveButton disabled={!choice} pending={tag.isPending} />
        </form>
      ) : null}
      {publishes ? (
        <AddInPlace label={t("new")}>
          {(close) => (
            <NewTopic
              onDone={(id) => {
                close();
                if (id) {
                  tag.mutate(id);
                }
              }}
            />
          )}
        </AddInPlace>
      ) : null}
      <ErrorLine error={tag.error ?? untag.error} />
    </section>
  );
};
