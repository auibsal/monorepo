"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ErrorLine, Field } from "../kit";
import { MemberPicker, type Person } from "../member-picker";

const key = ["admin", "journal", "contributors"];

/** The contributors (bylines) the newsroom can name. */
export const useBylines = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("contributors")
          .select("id, name_en, name_ar, is_pen_name")
          .order("name_en")
      ) ?? [],
    queryKey: key,
  });
};

/**
 * Finds a member's byline, or makes it: under their own name (which
 * follows their profile) or under a pen name. Only the id comes back, so a
 * pen name never leads to its author in the browser.
 */
export const useBylineFor = () => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      penName,
      person,
    }: {
      penName?: string;
      person: Person;
    }) => {
      const id = unwrap(
        await supabase.schema("journal").rpc("byline_for", {
          pen_name: penName?.trim() || undefined,
          person: person.id,
        })
      );
      await queryClient.invalidateQueries({ queryKey: key });
      return id ?? "";
    },
  });
};

/**
 * Who a piece is by (owner, Oct 31, 2026): a member chosen from the
 * register, under their own name or a pen name.
 */
export const BylinePicker = ({
  label,
  onChange,
  value,
}: {
  readonly label: string;
  readonly onChange: (contributorId: string) => void;
  readonly value: string;
}) => {
  const t = useTranslations("nexus.admin.journal.byline");
  const locale = useLocale();
  const bylines = useBylines();
  const choose = useBylineFor();
  const [penName, setPenName] = useState("");
  const [person, setPerson] = useState<Person | null>(null);
  const current = bylines.data?.find((c) => c.id === value);

  if (current) {
    return (
      <div className="grid gap-2">
        <span className="font-medium text-sm">{label}</span>
        <div className="flex items-center gap-3">
          <span>{localized(current, "name", locale)}</span>
          {current.is_pen_name ? (
            <span className="type-caption">{t("penName")}</span>
          ) : null}
          <Button
            onClick={() => onChange("")}
            size="sm"
            type="button"
            variant="ghost"
          >
            {t("change")}
          </Button>
        </div>
      </div>
    );
  }
  const use = () => {
    if (person) {
      choose.mutate(
        { penName, person },
        {
          onSuccess: (id) => {
            if (id) {
              setPenName("");
              setPerson(null);
              onChange(id);
            }
          },
        }
      );
    }
  };
  // The member first, then (if the piece runs under one) their pen name.
  return (
    <div className="grid gap-3">
      <MemberPicker label={label} onChange={setPerson} value={person} />
      {person ? (
        <>
          <Field hint={t("penNameHint")} label={t("penNameOptional")}>
            {(id) => (
              <Input
                className="max-w-sm"
                id={id}
                maxLength={80}
                onChange={(e) => setPenName(e.target.value)}
                value={penName}
              />
            )}
          </Field>
          <Button
            className="justify-self-start"
            disabled={choose.isPending}
            onClick={use}
            size="sm"
            type="button"
            variant="outline"
          >
            {t("use")}
          </Button>
        </>
      ) : null}
      <ErrorLine error={choose.error} />
    </div>
  );
};
