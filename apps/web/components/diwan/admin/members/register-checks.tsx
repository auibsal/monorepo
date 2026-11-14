"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Textarea } from "@repo/brand/components/ui/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";
import { Link } from "@/lib/diwan/navigation";
import { DiwanSection, RowList } from "../../page";
import { ErrorLine, Field } from "../kit";

const ADDRESS = /[^\s,;<>"]+@auib\.edu\.iq/giu;

/**
 * The enrollment check (decisions.md, Members): once a semester the
 * Director of Membership pastes Student Life's enrollment list; the
 * Register is matched by AUIB email and only the mismatches show. The list
 * is read in the one call and never kept, here or in the database.
 */
export const EnrollmentCheck = () => {
  const t = useTranslations("diwan.admin.members.enrollment");
  const tt = useTranslations("diwan.home.tiers");
  const locale = useLocale();
  const { supabase } = useAuth();
  const [list, setList] = useState("");
  const check = useMutation({
    mutationFn: async (enrolled: string[]) =>
      unwrap(
        await supabase
          .schema("membership")
          .rpc("enrollment_mismatches", { enrolled })
      ) ?? [],
    // The pasted list is cleared once read: nothing of it is kept.
    onSuccess: () => setList(""),
  });
  const addresses = [...new Set(list.match(ADDRESS) ?? [])];
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (addresses.length > 0) {
      check.mutate(addresses);
    }
  };
  return (
    <DiwanSection description={t("lede")} id="enrollment" title={t("title")}>
      <form className="grid max-w-2xl gap-3" onSubmit={submit}>
        <Field hint={t("hint")} label={t("list")}>
          {(id) => (
            <Textarea
              dir="ltr"
              id={id}
              onChange={(e) => setList(e.target.value)}
              rows={6}
              value={list}
            />
          )}
        </Field>
        <Button
          className="justify-self-start"
          disabled={addresses.length === 0 || check.isPending}
          type="submit"
          variant="outline"
        >
          {t("run", { count: String(addresses.length) })}
        </Button>
      </form>
      <ErrorLine error={check.error} />
      {check.data && check.data.length === 0 ? (
        <p className="type-body" role="status">
          {t("none")}
        </p>
      ) : null}
      {check.data && check.data.length > 0 ? (
        <RowList>
          {check.data.map((row) => (
            <li className="grid gap-1" key={row.user_id}>
              <Link
                className="link font-medium"
                href={`/membership/${row.user_id}`}
              >
                {(locale === "ar" && row.name_ar) || row.name_en}
              </Link>
              <p className="type-caption">
                {`${tt(row.tier)} · ${t(`issues.${row.issue as "not_enrolled" | "enrolled_associate"}`)}`}
              </p>
            </li>
          ))}
        </RowList>
      ) : null}
    </DiwanSection>
  );
};

/**
 * Accounts whose official name is incomplete (decisions.md, Members): from
 * before the four-part names. Only Membership corrects a name, with a
 * second officer, on the member's page.
 */
export const IncompleteNames = () => {
  const t = useTranslations("diwan.admin.members.incompleteNames");
  const locale = useLocale();
  const { supabase } = useAuth();
  const list = useQuery({
    queryFn: async () =>
      unwrap(await supabase.schema("membership").rpc("incomplete_names")) ?? [],
    queryKey: ["admin", "incomplete-names"],
  });
  if (!list.data?.length) {
    return <ErrorLine error={list.error} />;
  }
  return (
    <DiwanSection
      description={t("lede")}
      id="incomplete-names"
      title={t("title")}
    >
      <RowList>
        {list.data.map((row) => (
          <li className="grid gap-1" key={row.user_id}>
            <Link
              className="link font-medium"
              href={`/membership/${row.user_id}`}
            >
              {(locale === "ar" && row.name_ar) || row.name_en || "—"}
            </Link>
            <p className="type-caption">
              {[
                row.missing_en ? t("missingEn") : null,
                row.missing_ar ? t("missingAr") : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </li>
        ))}
      </RowList>
    </DiwanSection>
  );
};
