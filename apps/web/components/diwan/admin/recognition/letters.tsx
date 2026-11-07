"use client";

import { useAuth } from "@repo/auth/provider";
import { Input } from "@repo/brand/components/ui/input";
import { Textarea } from "@repo/brand/components/ui/textarea";
import type { Locale } from "@repo/internationalization";
import { formatPlainDate } from "@repo/internationalization/format";
import { Link as SiteLink } from "@repo/internationalization/navigation";
import { recognition } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { DateInput } from "@/components/fields/date-input";
import { SectionSpinner } from "../../states";
import {
  AddInPlace,
  BilingualField,
  DataTable,
  ErrorLine,
  Field,
  NewLink,
  SaveButton,
  SelectInput,
} from "../kit";
import { MemberPicker, type Person, useMemberNames } from "../member-picker";
import { memberName } from "../members/directory";

const key = ["admin", "recognition", "letters"];

type Lang = (typeof recognition.certificateLanguages)[number];

/**
 * Service letters (SAL-EXB-01 · F-05; owner, Nov 7, 2026): service is a
 * letter, never a certificate. The Director of Membership writes one on
 * request, from the one letter template, in the language the member asks
 * for; each carries a verification code checked on auibsal.org/verify.
 */
export const ServiceLetters = () => {
  const t = useTranslations("diwan.admin.recognition.letters");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const letters = useQuery({
    queryFn: () => recognition.serviceLetters(supabase),
    queryKey: key,
  });
  const rows = letters.data ?? [];
  const names = useMemberNames(rows.map((r) => r.user_id));
  const nameOf = (id: string) => {
    const member = names.data?.find((n) => n.id === id);
    return member ? memberName(member, locale) : "";
  };
  if (letters.isPending) {
    return <SectionSpinner />;
  }
  return (
    <div className="grid gap-6">
      <p className="type-body">{t("lede")}</p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <AddInPlace label={t("write")}>
          {(close) => <WriteLetter onDone={close} />}
        </AddInPlace>
        <NewLink href="/membership/service/letters/write">{t("other")}</NewLink>
      </div>
      <DataTable
        columns={[
          { cell: (r) => nameOf(r.user_id), header: t("holder"), key: "who" },
          {
            cell: (r) =>
              locale === "ar" ? (r.role_ar ?? r.role_en) : r.role_en,
            header: t("role"),
            key: "role",
          },
          {
            cell: (r) => formatPlainDate(r.issued_at, locale),
            header: t("issued"),
            key: "issued",
          },
          {
            cell: (r) => (
              <SiteLink
                className="link"
                href={`/account/record/letters/${r.id}`}
              >
                {t("open")}
              </SiteLink>
            ),
            header: "",
            key: "open",
          },
        ]}
        empty={t("empty")}
        rowKey={(r) => r.id}
        rows={rows}
      />
      <ErrorLine error={letters.error} />
    </div>
  );
};

const WriteLetter = ({ onDone }: { onDone: () => void }) => {
  const t = useTranslations("diwan.admin.recognition.letters");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [person, setPerson] = useState<Person | null>(null);
  const [role, setRole] = useState({ ar: "", en: "" });
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [hours, setHours] = useState("");
  const [lang, setLang] = useState<Lang>("en");
  const [body, setBody] = useState("");
  const save = useMutation({
    mutationFn: () =>
      recognition.issueServiceLetter(supabase, {
        body,
        hours: hours === "" ? null : Number(hours),
        lang,
        period_from: from,
        period_to: to,
        role_ar: role.ar,
        role_en: role.en,
        user_id: person?.id ?? "",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key });
      onDone();
    },
  });
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };
  return (
    <form className="grid max-w-3xl gap-4" onSubmit={onSubmit}>
      <MemberPicker label={t("holder")} onChange={setPerson} value={person} />
      <BilingualField
        label={t("role")}
        maxLength={200}
        onChange={setRole}
        value={role}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("from")}>
          {(id) => (
            <DateInput
              id={id}
              onChange={(e) => setFrom(e.target.value)}
              required
              value={from}
            />
          )}
        </Field>
        <Field hint={t("toHint")} label={t("to")}>
          {(id) => (
            <DateInput
              id={id}
              onChange={(e) => setTo(e.target.value)}
              value={to}
            />
          )}
        </Field>
      </div>
      <Field hint={t("hoursHint")} label={t("hours")}>
        {(id) => (
          <Input
            className="max-w-32"
            id={id}
            inputMode="decimal"
            min={0}
            onChange={(e) => setHours(e.target.value)}
            step="0.25"
            type="number"
            value={hours}
          />
        )}
      </Field>
      <Field hint={t("languageHint")} label={t("language")}>
        {(id) => (
          <SelectInput
            id={id}
            onChange={(e) => setLang(e.target.value as Lang)}
            value={lang}
          >
            {recognition.certificateLanguages.map((l) => (
              <option key={l} value={l}>
                {t(`languages.${l}`)}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>
      <Field hint={t("bodyHint")} label={t("body")}>
        {(id) => (
          <Textarea
            dir="auto"
            id={id}
            maxLength={3000}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            value={body}
          />
        )}
      </Field>
      <SaveButton
        disabled={!(person && role.en.trim() && from)}
        pending={save.isPending}
      />
      <ErrorLine error={save.error} />
    </form>
  );
};
