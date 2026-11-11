"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";
import { SUPPORTER_LOGOS } from "@/lib/institutions";
import { DiwanSection, RowList } from "../../page";
import { SectionSpinner } from "../../states";
import {
  AddInPlace,
  BilingualField,
  ConfirmAction,
  ErrorLine,
  Field,
  SaveButton,
  SelectInput,
} from "../kit";

const key = ["admin", "partners", "supporters"];

/** Each logo's width at 325 high, as AUIB's standard set is drawn. */
const LOGO_WIDTHS: Record<(typeof SUPPORTER_LOGOS)[number], number> = {
  auib: 1036,
  cas: 871,
  library: 721,
  press: 667,
  "student-life": 711,
};

const isLogo = (value: string): value is (typeof SUPPORTER_LOGOS)[number] =>
  (SUPPORTER_LOGOS as readonly string[]).includes(value);

/**
 * "With the support of" on /partners (decisions.md, Partners): AUIB's own
 * offices, kept here by Partnerships. Small rows, added in place; hiding
 * one keeps it on file.
 */
export const Supporters = () => {
  const t = useTranslations("diwan.admin.partners.supporters");
  const locale = useLocale();
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const list = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("supporters")
          .select("id, name_en, name_ar, url, logo, shown, sort")
          .order("sort")
          .order("name_en")
      ) ?? [],
    queryKey: key,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const change = useMutation({
    mutationFn: async ({ id, shown }: { id: string; shown: boolean }) =>
      unwrap(
        await supabase
          .schema("governance")
          .from("supporters")
          .update({ shown })
          .eq("id", id)
      ),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: async (id: string) =>
      unwrap(
        await supabase
          .schema("governance")
          .from("supporters")
          .delete()
          .eq("id", id)
      ),
    onSuccess: refresh,
  });

  return (
    <DiwanSection id="supporters" title={t("title")}>
      <p className="type-body text-text-secondary">{t("lede")}</p>
      {list.isPending ? <SectionSpinner /> : null}
      <RowList>
        {(list.data ?? []).map((row) => (
          <li className="flex flex-wrap items-center gap-3" key={row.id}>
            <span className="type-body grow">
              {locale === "ar" ? row.name_ar : row.name_en}
              {row.shown ? "" : ` · ${t("hidden")}`}
            </span>
            <Button
              disabled={change.isPending}
              onClick={() => change.mutate({ id: row.id, shown: !row.shown })}
              size="sm"
              variant="ghost"
            >
              {row.shown ? t("hide") : t("show")}
            </Button>
            <ConfirmAction
              confirmLabel={t("remove")}
              description={t("removeConfirm")}
              disabled={remove.isPending}
              onConfirm={() => remove.mutate(row.id)}
            >
              {t("remove")}
            </ConfirmAction>
          </li>
        ))}
      </RowList>
      <ErrorLine error={change.error ?? remove.error} />
      <AddInPlace label={t("add")}>
        {(close) => (
          <NewSupporter
            next={(list.data?.length ?? 0) * 10 + 10}
            onDone={() => {
              refresh();
              close();
            }}
          />
        )}
      </AddInPlace>
    </DiwanSection>
  );
};

const NewSupporter = ({
  next,
  onDone,
}: {
  readonly next: number;
  readonly onDone: () => void;
}) => {
  const t = useTranslations("diwan.admin.partners.supporters");
  const { supabase } = useAuth();
  const [name, setName] = useState({ ar: "", en: "" });
  const [url, setUrl] = useState("");
  const [logo, setLogo] = useState("");
  const add = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("supporters")
          .insert({
            logo: isLogo(logo) ? logo : null,
            logo_width: isLogo(logo) ? LOGO_WIDTHS[logo] : null,
            name_ar: name.ar.trim(),
            name_en: name.en.trim(),
            sort: next,
            url: url.trim() || null,
          })
      ),
    onSuccess: onDone,
  });
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        add.mutate();
      }}
    >
      <BilingualField
        label={t("name")}
        maxLength={120}
        onChange={setName}
        required
        value={name}
      />
      <Field hint={t("urlHint")} label={t("url")}>
        {(id) => (
          <Input
            dir="ltr"
            id={id}
            inputMode="url"
            onChange={(e) => setUrl(e.target.value)}
            type="url"
            value={url}
          />
        )}
      </Field>
      <Field label={t("logo")}>
        {(id) => (
          <SelectInput
            id={id}
            onChange={(e) => setLogo(e.target.value)}
            value={logo}
          >
            <option value="">{t("noLogo")}</option>
            {SUPPORTER_LOGOS.map((l) => (
              <option key={l} value={l}>
                {t(`logos.${l}`)}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>
      <SaveButton
        disabled={!(name.en.trim() && name.ar.trim())}
        pending={add.isPending}
      />
      <ErrorLine error={add.error} />
    </form>
  );
};
