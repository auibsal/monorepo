"use client";

import { Field } from "@repo/brand/components/sal/field";
import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { Textarea } from "@repo/brand/components/ui/textarea";
import { formatLongDate } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";
import { callApi } from "@/lib/diwan/api";
import { useGrants } from "@/lib/diwan/queries";
import { hasPermission } from "@/lib/rbac";
import { AdminHeading, DateTimeField, ErrorLine } from "../kit";

const key = ["admin", "council", "announcements"];

interface Notice {
  body_ar: string;
  body_en: string;
  id: string;
  instagram_done_at: string | null;
  link_path: string | null;
  sent_at: string | null;
  shown_at: string | null;
  tested_at: string | null;
  title_ar: string;
  title_en: string;
}

type Draft = Omit<
  Notice,
  "id" | "instagram_done_at" | "sent_at" | "shown_at" | "tested_at"
> & {
  id: string | null;
};

const BLANK: Draft = {
  body_ar: "",
  body_en: "",
  id: null,
  link_path: "",
  title_ar: "",
  title_en: "",
};

const useNotices = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      (unwrap(
        await supabase
          .schema("core")
          .from("announcements")
          .select(
            "id, title_en, title_ar, body_en, body_ar, link_path, tested_at, sent_at, shown_at, instagram_done_at"
          )
          .order("created_at", { ascending: false })
      ) ?? []) as Notice[],
    queryKey: key,
  });
};

/** The notice's words in both languages; saving clears its test. */
const Editor = ({
  draft,
  onSaved,
}: {
  draft: Draft;
  onSaved: () => Promise<void>;
}) => {
  const t = useTranslations("diwan.admin.announcements");
  const { supabase } = useAuth();
  const [form, setForm] = useState(draft);
  const set = (field: keyof Draft) => (value: string) =>
    setForm((f) => ({ ...f, [field]: value }));
  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase.schema("core").rpc("save_announcement", {
          body_ar: form.body_ar,
          body_en: form.body_en,
          id: form.id ?? undefined,
          link_path: form.link_path || undefined,
          title_ar: form.title_ar,
          title_en: form.title_en,
        })
      ),
    onSuccess: onSaved,
  });
  const complete =
    form.title_en.trim() &&
    form.title_ar.trim() &&
    form.body_en.trim() &&
    form.body_ar.trim();
  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid content-start gap-4" lang="en">
          <Field label={t("titleEn")}>
            {(id) => (
              <Input
                dir="ltr"
                id={id}
                maxLength={120}
                onChange={(e) => set("title_en")(e.target.value)}
                value={form.title_en}
              />
            )}
          </Field>
          <Field hint={t("bodyHint")} label={t("bodyEn")}>
            {(id) => (
              <Textarea
                dir="ltr"
                id={id}
                maxLength={2000}
                onChange={(e) => set("body_en")(e.target.value)}
                rows={10}
                value={form.body_en}
              />
            )}
          </Field>
        </div>
        <div className="grid content-start gap-4" lang="ar">
          <Field label={t("titleAr")}>
            {(id) => (
              <Input
                dir="rtl"
                id={id}
                maxLength={120}
                onChange={(e) => set("title_ar")(e.target.value)}
                value={form.title_ar}
              />
            )}
          </Field>
          <Field hint={t("bodyHint")} label={t("bodyAr")}>
            {(id) => (
              <Textarea
                dir="rtl"
                id={id}
                maxLength={2000}
                onChange={(e) => set("body_ar")(e.target.value)}
                rows={10}
                value={form.body_ar}
              />
            )}
          </Field>
        </div>
      </div>
      <Field hint={t("linkHint")} label={t("link")}>
        {(id) => (
          <Input
            className="max-w-sm"
            dir="ltr"
            id={id}
            onChange={(e) => set("link_path")(e.target.value)}
            placeholder={t("linkPlaceholder")}
            value={form.link_path ?? ""}
          />
        )}
      </Field>
      <Button
        className="justify-self-start"
        disabled={!complete || save.isPending}
        type="submit"
        variant="outline"
      >
        {t("save")}
      </Button>
      <ErrorLine error={save.error} />
    </form>
  );
};

/** The test to the President, then the President's go. */
const Sending = ({
  notice,
  refresh,
}: {
  notice: Notice;
  refresh: () => Promise<void>;
}) => {
  const t = useTranslations("diwan.admin.announcements");
  const locale = useLocale();
  const { supabase } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const test = useMutation({
    mutationFn: () =>
      callApi<{ sent: string }>(supabase, "/announcements/test", {
        id: notice.id,
      }),
    onSuccess: refresh,
  });
  const send = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("core")
          .rpc("send_announcement", { id: notice.id })
      ),
    onSuccess: async () => {
      setConfirming(false);
      await refresh();
    },
  });
  let testLine: string | null = null;
  if (test.data) {
    testLine = t("testSent", { email: test.data.sent });
  } else if (notice.tested_at) {
    testLine = t("tested", {
      date: formatLongDate(new Date(notice.tested_at), locale),
    });
  }
  return (
    <div className="border-line grid gap-3 border-t pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={test.isPending}
          onClick={() => test.mutate()}
          variant="outline"
        >
          {t("test")}
        </Button>
        {testLine ? (
          <p className="type-caption" role="status">
            {testLine}
          </p>
        ) : null}
      </div>
      <ErrorLine error={test.error} />
      {notice.tested_at && !confirming ? (
        <Button
          className="justify-self-start"
          onClick={() => setConfirming(true)}
        >
          {t("send")}
        </Button>
      ) : null}
      {confirming ? (
        <div className="grid gap-3">
          <p className="type-body font-medium">{t("confirm")}</p>
          <div className="flex flex-wrap gap-3">
            <Button disabled={send.isPending} onClick={() => send.mutate()}>
              {t("sendNow")}
            </Button>
            <Button onClick={() => setConfirming(false)} variant="outline">
              {t("notYet")}
            </Button>
          </div>
        </div>
      ) : null}
      <p className="type-caption text-text-secondary">{t("testNote")}</p>
      {send.error instanceof Error &&
      send.error.message.includes("one_email_a_week") ? (
        <p className="text-text text-sm" role="alert">
          {t("oneAWeek")}
        </p>
      ) : (
        <ErrorLine error={send.error} />
      )}
    </div>
  );
};

/**
 * Media makes the Instagram post or story from each notice sent or posted
 * (decisions.md, Channels and email), and marks it made here.
 */
const Instagram = ({
  notice,
  refresh,
}: {
  notice: Notice;
  refresh: () => Promise<void>;
}) => {
  const t = useTranslations("diwan.admin.announcements");
  const locale = useLocale();
  const { supabase } = useAuth();
  const done = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("core")
          .rpc("announcement_instagram_done", { id: notice.id })
      ),
    onSuccess: refresh,
  });
  if (!notice.shown_at) {
    return null;
  }
  return notice.instagram_done_at ? (
    <p className="type-caption text-text-secondary">
      {t("instagramDone", {
        date: formatLongDate(new Date(notice.instagram_done_at), locale),
      })}
    </p>
  ) : (
    <div className="flex flex-wrap items-center gap-3">
      <p className="type-body">{t("instagramToDo")}</p>
      <Button
        disabled={done.isPending}
        onClick={() => done.mutate()}
        size="sm"
        variant="outline"
      >
        {t("instagramMade")}
      </Button>
      <ErrorLine error={done.error} />
    </div>
  );
};

/**
 * "From the Society" (decisions.md, Qirtas): Media posts a notice to the
 * stream with the date it carries, with no email, or takes it out.
 */
const Stream = ({
  notice,
  refresh,
}: {
  notice: Notice;
  refresh: () => Promise<void>;
}) => {
  const t = useTranslations("diwan.admin.announcements");
  const locale = useLocale();
  const { supabase } = useAuth();
  const [shownAt, setShownAt] = useState<string | null>(notice.shown_at);
  const post = useMutation({
    mutationFn: async (at: string | null) =>
      unwrap(
        await supabase
          .schema("core")
          .rpc("post_notice", { id: notice.id, shown_at: at as string })
      ),
    onSuccess: refresh,
  });
  return (
    <div className="border-line grid gap-3 border-t pt-4">
      <h3 className="type-label">{t("streamTitle")}</h3>
      {notice.shown_at ? (
        <p className="type-caption">
          {t("shownOn", {
            date: formatLongDate(new Date(notice.shown_at), locale),
          })}
        </p>
      ) : null}
      <div className="max-w-md">
        <DateTimeField
          label={t("streamDate")}
          onChange={setShownAt}
          value={shownAt}
        />
      </div>
      <p className="type-caption text-text-secondary">{t("streamHint")}</p>
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={!shownAt || post.isPending || shownAt === notice.shown_at}
          onClick={() => post.mutate(shownAt)}
          variant="outline"
        >
          {t("post")}
        </Button>
        {notice.shown_at ? (
          <Button
            disabled={post.isPending}
            onClick={() => {
              setShownAt(null);
              post.mutate(null);
            }}
            variant="ghost"
          >
            {t("takeDown")}
          </Button>
        ) : null}
      </div>
      <ErrorLine error={post.error} />
    </div>
  );
};

/**
 * The Council → Announcements (decisions.md, Channels and email): the President writes a
 * notice in English and Arabic, sends its test to themselves, then says
 * go: one Resend Broadcast per language to the Sunday Paper's readers,
 * and Hudhud in the members' group and to linked members.
 */
export const Announcements = () => {
  const t = useTranslations("diwan.admin.announcements");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const notices = useNotices();
  const grants = useGrants();
  // The President sends; Media writes and posts to the stream.
  const president = hasPermission(grants.data, "roles.assign");
  const [adding, setAdding] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  return (
    <div className="grid gap-8">
      <AdminHeading
        actions={
          adding ? null : (
            <button
              className="link text-sm"
              onClick={() => setAdding(true)}
              type="button"
            >
              {t("new")}
            </button>
          )
        }
        title={t("title")}
      >
        {t("lede")}
      </AdminHeading>
      {adding ? (
        <section className="border-line grid gap-4 border-y py-6">
          <Editor
            draft={BLANK}
            onSaved={async () => {
              setAdding(false);
              await refresh();
            }}
          />
        </section>
      ) : null}
      <ErrorLine error={notices.error} />
      {notices.data?.length === 0 && !adding ? (
        <p className="type-body">{t("none")}</p>
      ) : null}
      <ul className="divide-line border-line grid divide-y border-y">
        {(notices.data ?? []).map((notice) => (
          <li className="grid gap-4 py-6" key={notice.id}>
            {notice.sent_at ? (
              <>
                <h2 className="type-heading">
                  {locale === "ar" ? notice.title_ar : notice.title_en}
                </h2>
                <p className="type-caption text-text-secondary">
                  {t("sentOn", {
                    date: formatLongDate(new Date(notice.sent_at), locale),
                  })}
                </p>
                <Instagram notice={notice} refresh={refresh} />
              </>
            ) : (
              <>
                <Editor
                  draft={{ ...notice, link_path: notice.link_path ?? "" }}
                  key={`${notice.id}-${notice.tested_at ?? ""}`}
                  onSaved={refresh}
                />
                {president ? (
                  <Sending notice={notice} refresh={refresh} />
                ) : null}
                <Stream notice={notice} refresh={refresh} />
                <Instagram notice={notice} refresh={refresh} />
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
