"use client";

import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Label } from "@repo/brand/components/ui/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { programmes } from "@/lib/data";
import { ErrorLine, SelectInput } from "../admin/kit";
import { PagePhoto } from "../tour-station";
import { Section } from "./section";

/**
 * The member's pages from the Typewriter Tour (decisions.md): typed on
 * the Tour, never on the site, and added to their account when they join
 * with the email they gave. Each stays private until they choose whether it
 * also appears on their profile or on the Tour's page: that choice is the
 * consent record. Shown only once there is one.
 */
export const SixWords = () => {
  const t = useTranslations("diwan.home.sixWords");
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const key = ["my-tour-pages", user?.id];
  const pages = useQuery({
    enabled: Boolean(user),
    queryFn: () => programmes.myPages(supabase, user?.id ?? ""),
    queryKey: key,
  });
  const choose = useMutation({
    mutationFn: ({
      id,
      visibility,
    }: {
      id: string;
      visibility: programmes.PageVisibility;
    }) => programmes.setPageVisibility(supabase, id, visibility),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  const naming = useMutation({
    mutationFn: ({ full, id }: { full: boolean; id: string }) =>
      programmes.setPageFullName(supabase, id, full),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  if (!pages.data?.length) {
    return null;
  }

  return (
    <Section description={t("description")} id="six-words" title={t("title")}>
      <ul className="grid gap-6">
        {pages.data.map((page) => (
          <li className="grid gap-3" key={page.id}>
            {page.text ? (
              <blockquote
                className="type-heading font-light whitespace-pre-line"
                dir="auto"
                lang={page.language === "other" ? undefined : page.language}
              >
                {page.text}
              </blockquote>
            ) : (
              <p className="type-caption text-text-secondary">
                {t("notTranscribed")}
              </p>
            )}
            {page.photo_path ? <PagePhoto id={page.id} /> : null}
            <div className="max-w-sm">
              <SelectInput
                aria-label={t("who")}
                disabled={choose.isPending}
                onChange={(e) =>
                  choose.mutate({
                    id: page.id,
                    visibility: e.target.value as programmes.PageVisibility,
                  })
                }
                value={page.visibility}
              >
                {programmes.PAGE_VISIBILITY.map((v) => (
                  <option key={v} value={v}>
                    {t(`visibility.${v}`)}
                  </option>
                ))}
              </SelectInput>
            </div>
            {page.visibility === "tour" ? (
              <div className="flex items-start gap-2">
                <Checkbox
                  checked={page.show_full_name}
                  disabled={naming.isPending}
                  id={`full-name-${page.id}`}
                  onCheckedChange={(checked) =>
                    naming.mutate({ full: checked === true, id: page.id })
                  }
                />
                <Label
                  className="leading-normal"
                  htmlFor={`full-name-${page.id}`}
                >
                  {t("fullName")}
                </Label>
              </div>
            ) : null}
            {page.publishable ? null : (
              <p className="type-caption">{t("takenDown")}</p>
            )}
          </li>
        ))}
      </ul>
      <ErrorLine error={choose.error ?? naming.error} />
    </Section>
  );
};
