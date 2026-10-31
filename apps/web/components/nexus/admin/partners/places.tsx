"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { RowList } from "../../page";
import { EmptyLine, SectionSpinner } from "../../states";
import { BilingualField, ErrorLine, Field, SelectInput } from "../kit";

const KEY = ["admin", "partner-places"] as const;

const blank = {
  body: { ar: "", en: "" },
  partner_id: "",
  title: { ar: "", en: "" },
};

/**
 * Places with partners on the Callboard (owner, Oct 31, 2026: Get involved
 * lists every open place, inside the Society and out): an internship, a
 * volunteer place or a role at one of the Society's partners, posted by
 * Partnerships and read by anyone.
 */
export const PartnerPlaces = () => {
  const t = useTranslations("nexus.admin.partners.places");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(blank);
  const partnerNames = useQuery({
    queryFn: async () =>
      unwrap(await supabase.schema("governance").rpc("partner_names")) ?? [],
    queryKey: ["admin", "partner-names"],
  });
  const places = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("openings")
          .select("id, title_en, title_ar, is_open, partner_id")
          .eq("kind", "partner")
          .order("created_at", { ascending: false })
      ) ?? [],
    queryKey: KEY,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });
  const add = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("openings")
          .insert({
            body_ar: form.body.ar || null,
            body_en: form.body.en || null,
            kind: "partner",
            owner: "partnerships",
            partner_id: form.partner_id,
            title_ar: form.title.ar,
            title_en: form.title.en,
          })
      ),
    onSuccess: async () => {
      setForm(blank);
      await refresh();
    },
  });
  const toggle = useMutation({
    mutationFn: async ({ id, open }: { id: string; open: boolean }) =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("openings")
          .update({ is_open: open })
          .eq("id", id)
      ),
    onSuccess: refresh,
  });
  const partnerName = (id: string | null) => {
    const found = (partnerNames.data ?? []).find((p) => p.id === id);
    return found ? localized(found, "name", locale) : "";
  };

  return (
    <div className="grid gap-8">
      <p className="type-body text-text-secondary">{t("lede")}</p>
      {places.isPending ? <SectionSpinner /> : null}
      {places.data?.length === 0 ? <EmptyLine>{t("empty")}</EmptyLine> : null}
      {places.data?.length ? (
        <RowList>
          {places.data.map((place) => (
            <li
              className="flex flex-wrap items-baseline justify-between gap-2 py-3"
              key={place.id}
            >
              <span className="grid gap-1">
                <span className="font-medium">
                  {localized(place, "title", locale)}
                </span>
                <span className="type-caption">
                  {partnerName(place.partner_id)}
                  {place.is_open ? "" : ` · ${t("closed")}`}
                </span>
              </span>
              <Button
                disabled={toggle.isPending}
                onClick={() =>
                  toggle.mutate({ id: place.id, open: !place.is_open })
                }
                size="sm"
                type="button"
                variant="outline"
              >
                {place.is_open ? t("close") : t("reopen")}
              </Button>
            </li>
          ))}
        </RowList>
      ) : null}
      <form
        className="grid max-w-3xl gap-4"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          add.mutate();
        }}
      >
        <h2 className="type-heading">{t("new")}</h2>
        <Field label={t("partner")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) =>
                setForm((f) => ({ ...f, partner_id: e.target.value }))
              }
              required
              value={form.partner_id}
            >
              <option value="">{t("choose")}</option>
              {(partnerNames.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {localized(p, "name", locale)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <BilingualField
          label={t("title")}
          maxLength={200}
          onChange={(title) => setForm((f) => ({ ...f, title }))}
          required
          value={form.title}
        />
        <BilingualField
          label={t("body")}
          maxLength={2000}
          multiline
          onChange={(body) => setForm((f) => ({ ...f, body }))}
          value={form.body}
        />
        <Button
          className="justify-self-start"
          disabled={add.isPending}
          type="submit"
        >
          {t("post")}
        </Button>
        <ErrorLine error={add.error ?? toggle.error} />
      </form>
    </div>
  );
};
