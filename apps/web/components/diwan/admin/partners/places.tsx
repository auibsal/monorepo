"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { BilingualField, ErrorLine, Field, SelectInput } from "../kit";

// Every opening list in the Diwan reads and refreshes under this key.
const KEY = ["admin", "openings"] as const;

const blank = {
  body: { ar: "", en: "" },
  partner_id: "",
  title: { ar: "", en: "" },
};

/**
 * A place with one of the Society's partners on Get involved (owner, Oct
 * 31, 2026: every open place, inside the Society and out): an internship,
 * a volunteer place or a role at a partner, posted by Partnerships.
 */
export const PartnerPlaceForm = ({
  onDone,
}: {
  readonly onDone: () => void;
}) => {
  const t = useTranslations("diwan.admin.partners.places");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(blank);
  const partnerNames = useQuery({
    queryFn: async () =>
      unwrap(await supabase.schema("governance").rpc("partner_names")) ?? [],
    queryKey: ["admin", "partner-names"],
  });
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
      await queryClient.invalidateQueries({ queryKey: KEY });
      onDone();
    },
  });

  return (
    <form
      className="grid max-w-3xl gap-4"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        add.mutate();
      }}
    >
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
      <ErrorLine error={add.error} />
    </form>
  );
};
