"use client";

import { Button } from "@repo/brand/components/ui/button";
import type { Locale } from "@repo/internationalization";
import {
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ErrorLine } from "@/components/diwan/admin/kit";
import { Section } from "@/components/diwan/home/section";
import { RowList } from "@/components/diwan/page";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";

const KEY = ["governance", "open-motions"];

/**
 * Motions and petitions for a members' meeting (decisions.md, Governance):
 * submissions, not signatures. Members read each and support it with one
 * click, and propose their own.
 */
export const Motions = () => {
  const t = useTranslations("diwan.society.motions");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const motions = useQuery({
    queryFn: async () =>
      unwrap(await supabase.schema("governance").rpc("open_motions")) ?? [],
    queryKey: KEY,
  });
  const support = useMutation({
    mutationFn: async ({ id, on }: { id: string; on: boolean }) =>
      unwrap(
        await supabase
          .schema("governance")
          .rpc("support_motion", { submission_id: id, support: on })
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
  return (
    <Section
      action={
        <Link className="link" href="/account/elections/motion">
          {t("propose")}
        </Link>
      }
      description={t("lede")}
      id="motions"
      title={t("title")}
    >
      {motions.data?.length ? (
        <RowList>
          {motions.data.map((m) => (
            <li className="grid gap-2" key={m.id}>
              <p className="font-medium">{m.title}</p>
              <p className="type-caption">
                {t("line", {
                  date: formatLongDate(m.submitted_at, locale),
                  mover: (locale === "ar" && m.mover_ar) || m.mover_en || "",
                  reference: m.reference ?? "",
                })}
              </p>
              {m.resolves ? (
                <p className="type-body max-w-[60ch] whitespace-pre-line">
                  {m.resolves}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  disabled={support.isPending}
                  onClick={() => support.mutate({ id: m.id, on: !m.mine })}
                  size="sm"
                  variant="outline"
                >
                  {m.mine ? t("withdrawSupport") : t("support")}
                </Button>
                <span className="type-caption">
                  {t("supporters", {
                    count: formatNumber(Number(m.supporters)),
                  })}
                </span>
              </div>
            </li>
          ))}
        </RowList>
      ) : (
        <p className="type-body text-text-secondary">{t("none")}</p>
      )}
      <ErrorLine error={support.error ?? motions.error} />
    </Section>
  );
};
