"use client";

import { useAuth } from "@repo/auth/provider";
import { Input } from "@repo/brand/components/ui/input";
import { events, localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { DiwanSection, RowList } from "../../page";
import {
  AddInPlace,
  BilingualField,
  ConfirmAction,
  ErrorLine,
  Field,
  SaveButton,
} from "../kit";

const key = (eventId: string) => ["admin", "session-links", eventId];

const NewLink = ({
  eventId,
  onDone,
}: {
  readonly eventId: string;
  readonly onDone: () => void;
}) => {
  const t = useTranslations("diwan.admin.event.links");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [label, setLabel] = useState({ ar: "", en: "" });
  const [url, setUrl] = useState("");
  const parsed = events.sessionLinkSchema.safeParse({
    label_ar: label.ar,
    label_en: label.en,
    url,
  });
  const add = useMutation({
    mutationFn: async () => {
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "invalid_url");
      }
      return unwrap(
        await supabase
          .schema("events")
          .from("session_links")
          .insert({ ...parsed.data, event_id: eventId })
      );
    },
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
        label={t("label")}
        maxLength={200}
        onChange={setLabel}
        value={label}
      />
      <Field hint={t("urlHint")} label={t("url")}>
        {(id) => (
          <Input
            dir="ltr"
            id={id}
            inputMode="url"
            onChange={(e) => setUrl(e.target.value)}
            required
            type="url"
            value={url}
          />
        )}
      </Field>
      <SaveButton
        disabled={!(parsed.success && (label.en.trim() || label.ar.trim()))}
        pending={add.isPending}
      />
      <ErrorLine error={add.error} />
    </form>
  );
};

/**
 * A session's outside links (the design review A37, Nov 4, 2026): what was
 * played or read, added in place; the program's past sessions show them.
 */
export const SessionLinks = ({ eventId }: { readonly eventId: string }) => {
  const t = useTranslations("diwan.admin.event.links");
  const locale = useLocale() as "en" | "ar";
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const links = useQuery({
    queryFn: () => events.sessionLinks(supabase, [eventId]),
    queryKey: key(eventId),
  });
  const remove = useMutation({
    mutationFn: async (id: string) =>
      unwrap(
        await supabase
          .schema("events")
          .from("session_links")
          .delete()
          .eq("id", id)
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(eventId) }),
  });
  return (
    <DiwanSection id="links" title={t("title")}>
      <p className="type-body text-text-secondary">{t("lede")}</p>
      {links.data?.length ? (
        <RowList>
          {links.data.map((link) => (
            <li
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
              key={link.id}
            >
              <span className="grid gap-0.5">
                <span className="type-body">
                  {localized(link, "label", locale) ||
                    link.label_en ||
                    link.label_ar}
                </span>
                <a
                  className="type-caption link break-all"
                  dir="ltr"
                  href={link.url}
                  rel="noopener"
                  target="_blank"
                >
                  {link.url}
                </a>
              </span>
              <ConfirmAction
                confirmLabel={t("remove")}
                description={t("removeConfirm")}
                disabled={remove.isPending}
                onConfirm={() => remove.mutate(link.id)}
                variant="ghost"
              >
                {t("remove")}
              </ConfirmAction>
            </li>
          ))}
        </RowList>
      ) : null}
      <AddInPlace label={t("new")}>
        {(close) => <NewLink eventId={eventId} onDone={close} />}
      </AddInPlace>
      <ErrorLine error={remove.error} />
    </DiwanSection>
  );
};
