"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { slugify } from "../events/editor";
import { ErrorLine } from "../kit";
import { MemberPicker, type Person } from "../member-picker";

const key = ["admin", "journal", "contributors"];

/** The contributors (bylines) the newsroom can name: people and Anonymous. */
export const useBylines = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("contributors")
          .select("id, name_en, name_ar, is_pen_name, is_anonymous, user_id")
          .order("name_en")
      ) ?? [],
    queryKey: key,
  });
};

/**
 * Who a piece is by (owner, Oct 31, 2026): a member chosen from the
 * register, or Anonymous. Choosing a member who has no byline yet makes
 * one; their names follow their profile.
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
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const bylines = useBylines();
  const current = bylines.data?.find((c) => c.id === value);
  const anonymous = bylines.data?.find((c) => c.is_anonymous);

  const choose = useMutation({
    mutationFn: async (person: Person) => {
      const existing = bylines.data?.find(
        (c) => c.user_id === person.id && !c.is_pen_name
      );
      if (existing) {
        return existing.id;
      }
      const created = unwrap(
        await supabase
          .schema("journal")
          .from("contributors")
          .insert({
            name_ar: person.full_name_ar,
            name_en: person.full_name_en,
            slug: `${slugify(person.full_name_en)}-${person.id.slice(0, 4)}`,
            user_id: person.id,
          })
          .select("id")
          .single()
      );
      await queryClient.invalidateQueries({ queryKey: key });
      return created?.id ?? "";
    },
    onSuccess: (id) => {
      if (id) {
        onChange(id);
      }
    },
  });

  if (current) {
    return (
      <div className="grid gap-2">
        <span className="font-medium text-sm">{label}</span>
        <div className="flex items-center gap-3">
          <span>{localized(current, "name", locale)}</span>
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
  return (
    <div className="grid gap-3">
      <MemberPicker
        label={label}
        onChange={(person) => {
          if (person) {
            choose.mutate(person);
          }
        }}
        value={null}
      />
      {anonymous ? (
        <Button
          className="justify-self-start"
          onClick={() => onChange(anonymous.id)}
          size="sm"
          type="button"
          variant="outline"
        >
          {t("anonymous")}
        </Button>
      ) : null}
      <ErrorLine error={choose.error} />
    </div>
  );
};
