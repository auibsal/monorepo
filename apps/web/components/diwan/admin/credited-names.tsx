"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { names, unwrap } from "@/lib/data";
import { DiwanSection, RowList } from "../page";
import { ErrorLine, Field } from "./kit";
import { MemberPicker, type Person } from "./member-picker";

const KEY = ["admin", "credited-names"];

/**
 * Credited names (decisions.md, Members): a name someone is known by on
 * screen or on stage, set by Media or the Artistic Director and used only
 * in credits, captions and playbills. Everything else carries the official
 * name.
 */
export const CreditedNames = () => {
  const t = useTranslations("diwan.admin.creditedNames");
  const locale = useLocale();
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [person, setPerson] = useState<Person | null>(null);
  const [en, setEn] = useState("");
  const [ar, setAr] = useState("");
  const list = useQuery({
    queryFn: async () =>
      unwrap(await supabase.schema("programmes").rpc("credited_names")) ?? [],
    queryKey: KEY,
  });
  const save = useMutation({
    mutationFn: async (input: { ar: string; en: string; member: string }) =>
      unwrap(
        await supabase.schema("programmes").rpc("set_credited_name", {
          member: input.member,
          name_ar: input.ar,
          name_en: input.en,
        })
      ),
    onSuccess: async () => {
      setPerson(null);
      setEn("");
      setAr("");
      await queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
  const valid =
    Boolean(person) &&
    (en.trim() || ar.trim()) &&
    names.inScript(en, "en") &&
    names.inScript(ar, "ar");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (valid && person) {
      save.mutate({ ar, en, member: person.id });
    }
  };
  return (
    <DiwanSection
      description={t("lede")}
      id="credited-names"
      title={t("title")}
    >
      {list.data?.length ? (
        <RowList>
          {list.data.map((row) => (
            <li
              className="flex flex-wrap items-baseline gap-x-6 gap-y-1"
              key={row.user_id}
            >
              <span className="font-medium">
                {(locale === "ar" && row.name_ar) || row.name_en}
              </span>
              <span className="type-caption">
                {[row.credited_en, row.credited_ar].filter(Boolean).join(" · ")}
              </span>
              <button
                className="link type-caption"
                disabled={save.isPending}
                onClick={() =>
                  save.mutate({ ar: "", en: "", member: row.user_id })
                }
                type="button"
              >
                {t("remove")}
              </button>
            </li>
          ))}
        </RowList>
      ) : null}
      <form className="grid max-w-xl gap-4" onSubmit={submit}>
        <MemberPicker label={t("person")} onChange={setPerson} value={person} />
        <Field label={t("en")}>
          {(id) => (
            <Input
              dir="ltr"
              id={id}
              lang="en"
              maxLength={80}
              onChange={(e) => setEn(e.target.value)}
              value={en}
            />
          )}
        </Field>
        <Field label={t("ar")}>
          {(id) => (
            <Input
              dir="rtl"
              id={id}
              lang="ar"
              maxLength={80}
              onChange={(e) => setAr(e.target.value)}
              value={ar}
            />
          )}
        </Field>
        <Button
          className="justify-self-start"
          disabled={!valid || save.isPending}
          type="submit"
          variant="outline"
        >
          {t("save")}
        </Button>
        <ErrorLine error={save.error ?? list.error} />
      </form>
    </DiwanSection>
  );
};
