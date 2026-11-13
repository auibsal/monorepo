"use client";

import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";
import { ErrorLine } from "../admin/kit";
import { SectionSpinner } from "../states";

type Topic = "paper" | "news" | "reminders" | "notices" | "word";
type Channel = "email" | "telegram";

interface Notices {
  linked: boolean;
  news_email: boolean;
  news_tg: boolean;
  notices_tg: boolean;
  paper_email: boolean;
  paper_tg: boolean;
  reminders_email: boolean;
  reminders_tg: boolean;
  word_tg: boolean;
}

/** Which cell each topic has on each channel; null where it has none. */
const CELLS: Record<
  Topic,
  { email: keyof Notices | "always" | null; telegram: keyof Notices | null }
> = {
  news: { email: "news_email", telegram: "news_tg" },
  notices: { email: "always", telegram: "notices_tg" },
  paper: { email: "paper_email", telegram: "paper_tg" },
  reminders: { email: "reminders_email", telegram: "reminders_tg" },
  word: { email: null, telegram: "word_tg" },
};

const TOPICS: Topic[] = ["paper", "news", "reminders", "notices", "word"];

/**
 * Notices, one model on every channel (decisions.md, Channels and email): each topic
 * on email and on Hudhud, the same switches as Hudhud's /me. Reminders go
 * by Hudhud in place of the email when both are on; your own notices
 * (account, forms, decisions) always come by email.
 */
export const NoticeGrid = () => {
  const t = useTranslations("diwan.settings.grid");
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const key = ["account", "notices", user?.id];
  const notices = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      (unwrap(await supabase.schema("core").rpc("my_notices"))?.[0] ??
        null) as Notices | null,
    queryKey: key,
  });
  const save = useMutation({
    mutationFn: async (change: {
      channel: Channel;
      on: boolean;
      topic: Topic;
    }) =>
      unwrap(
        await supabase.schema("core").rpc("set_my_notice", {
          channel: change.channel,
          topic: change.topic,
          turn_on: change.on,
        })
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  if (!notices.data) {
    return notices.isPending ? <SectionSpinner /> : null;
  }
  const { data } = notices;
  const cell = (topic: Topic, channel: Channel) => {
    const field = CELLS[topic][channel];
    if (field === null) {
      return <span className="type-caption">{t("none")}</span>;
    }
    if (field === "always") {
      return <span className="type-caption">{t("always")}</span>;
    }
    if (channel === "telegram" && !data.linked) {
      return <span className="type-caption">{t("linkFirst")}</span>;
    }
    const pending =
      save.isPending &&
      save.variables?.topic === topic &&
      save.variables.channel === channel;
    const checked = pending
      ? Boolean(save.variables?.on)
      : Boolean(data[field]);
    return (
      <Checkbox
        aria-label={`${t(`topics.${topic}`)}: ${t(`channels.${channel}`)}`}
        checked={checked}
        disabled={save.isPending}
        onCheckedChange={(v) => save.mutate({ channel, on: v === true, topic })}
      />
    );
  };
  return (
    <div className="grid gap-3">
      <div className="overflow-x-auto">
        <table className="w-full text-start">
          <caption className="sr-only">{t("caption")}</caption>
          <thead>
            <tr className="border-line border-b">
              <th className="type-label py-2 text-start" scope="col">
                {t("topic")}
              </th>
              <th className="type-label py-2 text-start" scope="col">
                {t("channels.email")}
              </th>
              <th className="type-label py-2 text-start" scope="col">
                {t("channels.telegram")}
              </th>
            </tr>
          </thead>
          <tbody>
            {TOPICS.map((topic) => (
              <tr className="border-line border-b align-top" key={topic}>
                <th className="py-3 pe-4 text-start font-normal" scope="row">
                  <span className="type-body block">
                    {t(`topics.${topic}`)}
                  </span>
                  <span className="type-caption block">
                    {t(`hints.${topic}`)}
                  </span>
                </th>
                <td className="py-3 pe-4">{cell(topic, "email")}</td>
                <td className="py-3">{cell(topic, "telegram")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="type-caption">{t("reminderRule")}</p>
      <ErrorLine error={save.error} />
    </div>
  );
};
