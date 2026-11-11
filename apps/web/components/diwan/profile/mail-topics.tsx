"use client";

import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Label } from "@repo/brand/components/ui/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";
import { ErrorLine } from "../admin/kit";

interface Topics {
  news: boolean;
  paper: boolean;
}

/**
 * The mailing list's two topics (decisions.md, Channels and email), each
 * left separately: "The Sunday Paper" and "Society news and events". Saved
 * as soon as one is ticked.
 */
export const MailTopics = () => {
  const t = useTranslations("web.newsletter.topics");
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const id = useId();
  const key = ["account", "mail-topics", user?.id];
  const topics = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      (unwrap(await supabase.schema("core").rpc("my_topics"))?.[0] ?? {
        news: false,
        paper: false,
      }) as Topics,
    queryKey: key,
  });
  const save = useMutation({
    mutationFn: async (next: Topics) =>
      unwrap(await supabase.schema("core").rpc("set_my_topics", next)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  if (!topics.data) {
    return null;
  }
  const shown = save.isPending && save.variables ? save.variables : topics.data;
  return (
    <fieldset className="grid gap-2">
      <legend className="type-label mb-2">{t("legend")}</legend>
      {(["paper", "news"] as const).map((topic) => (
        <div className="flex items-start gap-3" key={topic}>
          <Checkbox
            checked={shown[topic]}
            disabled={save.isPending}
            id={`${id}-${topic}`}
            onCheckedChange={(v) =>
              save.mutate({ ...shown, [topic]: v === true })
            }
          />
          <Label className="leading-normal" htmlFor={`${id}-${topic}`}>
            {t(topic)}
          </Label>
        </div>
      ))}
      <ErrorLine error={save.error} />
    </fieldset>
  );
};
