"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import type { Locale } from "@repo/internationalization";
import { journal, localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";
import { Link } from "@/lib/nexus/navigation";
import { OnTheSite } from "../../site-links";
import { ErrorState, PageSpinner } from "../../states";
import {
  AdminHeading,
  BilingualField,
  ConfirmAction,
  DateTimeField,
  ErrorLine,
  Field,
  SaveButton,
  SelectInput,
} from "../kit";
import { type openingKinds, SkillsPicker } from "./callboard";

type Kind = (typeof openingKinds)[number];

const COLUMNS =
  "id, kind, owner, role, title_en, title_ar, body_en, body_ar, skills, closes_at, is_open, places, term_from, term_to, desk, partner_id";

/** Where an opening lives in the Diwan: its list, which the page returns to. */
export interface OpeningEditorProps {
  /** The list's own path ("/people/hiring", "/events/salon/places"). */
  readonly back: string;
  readonly id: string;
}

/**
 * One opening, on its own page (owner, Oct 31, 2026: editing in the Diwan
 * opens its own address, one step under its list). Every opening edits the
 * same way, whichever list it is on: its title and description, the
 * skills it wants, when it closes, and for a place its number, term,
 * Qirtas section or partner. Its kind (and a role opening's role) stays as
 * posted. Closing takes it off Get involved; reopening puts it back.
 */
export const OpeningEditor = ({ back, id }: OpeningEditorProps) => {
  const t = useTranslations("nexus.admin.programmes.callboard");
  const tj = useTranslations("nexus.admin.journal");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["admin", "opening", id];

  const opening = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("openings")
          .select(COLUMNS)
          .eq("id", id)
          .maybeSingle()
      ),
    queryKey,
  });
  const kind = (opening.data?.kind ?? "role") as Kind;
  const partners = useQuery({
    enabled: kind === "first_ink" || kind === "partner",
    queryFn: async () =>
      unwrap(await supabase.schema("governance").rpc("partner_names")) ?? [],
    queryKey: ["admin", "partner-names"],
  });

  const [form, setForm] = useState({
    body: { ar: "", en: "" },
    closes_at: null as string | null,
    desk: "" as journal.Desk | "",
    partner_id: "",
    places: "",
    skills: [] as string[],
    term_from: "",
    term_to: "",
    title: { ar: "", en: "" },
  });
  // The form starts from the opening as saved.
  useEffect(() => {
    const row = opening.data;
    if (row) {
      setForm({
        body: { ar: row.body_ar ?? "", en: row.body_en ?? "" },
        closes_at: row.closes_at,
        desk: (row.desk ?? "") as journal.Desk | "",
        partner_id: row.partner_id ?? "",
        places: row.places ? String(row.places) : "",
        skills: row.skills ?? [],
        term_from: row.term_from ?? "",
        term_to: row.term_to ?? "",
        title: { ar: row.title_ar ?? "", en: row.title_en ?? "" },
      });
    }
  }, [opening.data]);

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      queryClient.invalidateQueries({ queryKey: ["admin"] }),
      queryClient.invalidateQueries({ queryKey: ["open-places"] }),
      queryClient.invalidateQueries({ queryKey: ["openings"] }),
    ]);

  const save = useMutation({
    mutationFn: async () => {
      const place = kind !== "role";
      return unwrap(
        await supabase
          .schema("programmes")
          .from("openings")
          .update({
            body_ar: form.body.ar || null,
            body_en: form.body.en || null,
            closes_at: form.closes_at,
            desk: kind === "apprenticeship" && form.desk ? form.desk : null,
            partner_id:
              kind === "first_ink" || kind === "partner"
                ? form.partner_id || null
                : null,
            places: place && form.places ? Number(form.places) : null,
            skills: form.skills,
            term_from: place && form.term_from ? form.term_from : null,
            term_to: place && form.term_to ? form.term_to : null,
            title_ar: form.title.ar,
            title_en: form.title.en,
          })
          .eq("id", id)
      );
    },
    onSuccess: refresh,
  });
  const toggle = useMutation({
    mutationFn: async (open: boolean) =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("openings")
          .update({ is_open: open })
          .eq("id", id)
      ),
    onSuccess: refresh,
  });

  if (opening.isPending) {
    return <PageSpinner />;
  }
  if (opening.isError) {
    return <ErrorState onRetry={() => opening.refetch()} />;
  }
  if (!opening.data) {
    return (
      <div className="grid gap-4">
        <AdminHeading title={t("missing")} />
        <Link className="link justify-self-start" href={back}>
          {t("back")}
        </Link>
      </div>
    );
  }
  const row = opening.data;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  return (
    <div className="grid max-w-3xl gap-8">
      <AdminHeading
        actions={
          <>
            <Link className="link" href={back}>
              {t("back")}
            </Link>
            {/* Where everyone reads it: Get involved. */}
            <OnTheSite href="/get-involved" />
          </>
        }
        title={localized(row, "title", locale) || t("untitled")}
      >
        {[t(`kinds.${kind}`), row.is_open ? t("open") : t("closed")].join(
          " · "
        )}
      </AdminHeading>

      <form className="grid gap-4" onSubmit={submit}>
        <BilingualField
          label={t("title")}
          maxLength={200}
          onChange={(title) => setForm((f) => ({ ...f, title }))}
          required={kind !== "role"}
          value={form.title}
        />
        <BilingualField
          label={t("body")}
          maxLength={2000}
          multiline
          onChange={(body) => setForm((f) => ({ ...f, body }))}
          rows={4}
          value={form.body}
        />
        <SkillsPicker
          onChange={(skills) => setForm((f) => ({ ...f, skills }))}
          value={form.skills}
        />
        {kind === "apprenticeship" ? (
          <Field hint={t("deskHint")} label={t("desk")}>
            {(fieldId) => (
              <SelectInput
                id={fieldId}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    desk: e.target.value as journal.Desk | "",
                  }))
                }
                value={form.desk}
              >
                <option value="">{t("noDesk")}</option>
                {journal.desks.map((d) => (
                  <option key={d} value={d}>
                    {tj(`desks.${d}`)}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
        ) : null}
        {kind === "first_ink" || kind === "partner" ? (
          <Field hint={t("partnerHint")} label={t("partner")}>
            {(fieldId) => (
              <SelectInput
                id={fieldId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, partner_id: e.target.value }))
                }
                required
                value={form.partner_id}
              >
                <option value="">{t("choosePartner")}</option>
                {(partners.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {localized(p, "name", locale)}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
        ) : null}
        {kind === "role" || kind === "partner" ? null : (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("places")}>
              {(fieldId) => (
                <Input
                  dir="ltr"
                  id={fieldId}
                  max={100}
                  min={1}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, places: e.target.value }))
                  }
                  type="number"
                  value={form.places}
                />
              )}
            </Field>
            <Field label={t("termFrom")}>
              {(fieldId) => (
                <Input
                  dir="ltr"
                  id={fieldId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, term_from: e.target.value }))
                  }
                  type="date"
                  value={form.term_from}
                />
              )}
            </Field>
            <Field label={t("termTo")}>
              {(fieldId) => (
                <Input
                  dir="ltr"
                  id={fieldId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, term_to: e.target.value }))
                  }
                  type="date"
                  value={form.term_to}
                />
              )}
            </Field>
          </div>
        )}
        <DateTimeField
          label={t("closes")}
          onChange={(closes_at) => setForm((f) => ({ ...f, closes_at }))}
          value={form.closes_at}
        />
        <SaveButton pending={save.isPending} success={save.isSuccess} />
        <ErrorLine error={save.error} />
      </form>

      <div className="grid gap-2 border-line border-t pt-space-4">
        {row.is_open ? (
          <ConfirmAction
            confirmLabel={t("close")}
            description={t("closeConfirm")}
            disabled={toggle.isPending}
            onConfirm={() => toggle.mutate(false)}
            variant="ghost"
          >
            {t("close")}
          </ConfirmAction>
        ) : (
          <Button
            className="justify-self-start"
            disabled={toggle.isPending}
            onClick={() => toggle.mutate(true)}
            size="sm"
            variant="ghost"
          >
            {t("reopen")}
          </Button>
        )}
        <ErrorLine error={toggle.error} />
      </div>
    </div>
  );
};
