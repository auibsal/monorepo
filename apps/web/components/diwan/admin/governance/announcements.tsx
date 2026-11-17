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
import { DraftOffer, useAutosave } from "@/lib/diwan/autosave";
import { Link, useRouter } from "@/lib/diwan/navigation";
import { useGrants } from "@/lib/diwan/queries";
import { hasPermission } from "@/lib/rbac";
import { RowList } from "../../page";
import { SectionSpinner } from "../../states";
import {
  AdminHeading,
  DateTimeField,
  ErrorLine,
  NewLink,
  RecordPage,
  RecordView,
  SaveButton,
} from "../kit";
import { PresetStart } from "../presets";
import { DeleteRecord, RecentlyDeleted } from "../recently-deleted";
import { EditableSection } from "../record";
import { RecordHistory } from "../record-history";

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
          .schema("api")
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
  onSaved: (id: string) => Promise<void> | void;
}) => {
  const t = useTranslations("diwan.admin.announcements");
  const { supabase } = useAuth();
  const [form, setForm] = useState(draft);
  // Kept as it is typed until Save (decisions.md, The site: autosave).
  const autosave = useAutosave({
    initial: draft,
    recordKey: `announcement:${draft.id ?? "new"}`,
    value: form,
  });
  const set = (field: keyof Draft) => (value: string) =>
    setForm((f) => ({ ...f, [field]: value }));
  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase.schema("api").rpc("save_announcement", {
          body_ar: form.body_ar,
          body_en: form.body_en,
          id: form.id ?? undefined,
          link_path: form.link_path || undefined,
          title_ar: form.title_ar,
          title_en: form.title_en,
        })
      ),
    onSuccess: async (id) => {
      await autosave.clear();
      await onSaved(id ?? form.id ?? "");
    },
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
      <DraftOffer autosave={autosave} onRestore={setForm} />
      {form.id ? null : (
        <PresetStart
          kind="announcement"
          onPick={({ body, title }) =>
            setForm((f) => ({
              ...f,
              body_ar: body.ar,
              body_en: body.en,
              title_ar: title.ar,
              title_en: title.en,
            }))
          }
        />
      )}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid content-start gap-4" dir="ltr" lang="en">
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
        <div className="grid content-start gap-4" dir="rtl" lang="ar">
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
      <SaveButton
        disabled={!complete}
        pending={save.isPending}
        success={save.isSuccess}
      />
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
        await supabase.schema("api").rpc("send_announcement", { id: notice.id })
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
          .schema("api")
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
          .schema("api")
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

const useNotice = (id: string) => {
  const notices = useNotices();
  return {
    ...notices,
    data: notices.data?.find((notice) => notice.id === id) ?? null,
  };
};

/**
 * The Council → Announcements (decisions.md, Channels and email): the
 * President writes a notice in English and Arabic, sends its test to
 * themselves, then says go: one Resend Broadcast per language to the
 * Sunday Paper's readers, and Hudhud in the members' group and to linked
 * members. Each notice is a record with its own page.
 */
export const Announcements = () => {
  const t = useTranslations("diwan.admin.announcements");
  const locale = useLocale();
  const notices = useNotices();
  return (
    <div className="grid gap-8">
      <AdminHeading
        actions={
          <NewLink href="/council/announcements/new">{t("new")}</NewLink>
        }
        title={t("title")}
      />
      <ErrorLine error={notices.error} />
      {notices.data?.length === 0 ? (
        <p className="type-body">{t("none")}</p>
      ) : null}
      <RowList>
        {(notices.data ?? []).map((notice) => (
          <li className="grid gap-1" key={notice.id}>
            <Link
              className="hover:text-accent type-body font-medium"
              href={`/council/announcements/${notice.id}`}
            >
              {locale === "ar" ? notice.title_ar : notice.title_en}
            </Link>
            <span className="type-caption text-text-secondary">
              {notice.sent_at
                ? t("sentOn", {
                    date: formatLongDate(new Date(notice.sent_at), locale),
                  })
                : t("draft")}
            </span>
          </li>
        ))}
      </RowList>
      <RecentlyDeleted kind="announcement" />
    </div>
  );
};

/** A new notice: written, then opened on its own page. */
const NewAnnouncement = () => {
  const t = useTranslations("diwan.admin.announcements");
  const queryClient = useQueryClient();
  const router = useRouter();
  return (
    <RecordPage
      back="/council/announcements"
      backLabel={t("title")}
      title={t("new")}
    >
      <Editor
        draft={BLANK}
        onSaved={async (id) => {
          await queryClient.invalidateQueries({ queryKey: key });
          router.push(`/council/announcements/${id}`);
        }}
      />
    </RecordPage>
  );
};

/**
 * One notice's record page (decisions.md, The site: "One record page"):
 * its words, edited in place until it is sent; sending, the stream and
 * Instagram; History last.
 */
export const AnnouncementRecord = ({ id }: { readonly id: string }) => {
  const t = useTranslations("diwan.admin.announcements");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const grants = useGrants();
  const notice = useNotice(id);
  // The President sends; Media writes and posts to the stream.
  const president = hasPermission(grants.data, "roles.assign");
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  if (id === "new") {
    return <NewAnnouncement />;
  }
  if (notice.isPending) {
    return <SectionSpinner />;
  }
  const record = notice.data;
  if (!record) {
    return <p className="type-body">{t("notFound")}</p>;
  }
  const ar = locale === "ar";
  return (
    <RecordView
      back={
        <Link className="link" href="/council/announcements">
          {t("title")}
        </Link>
      }
      history={<RecordHistory id={record.id} table="core.announcements" />}
      menu={
        record.sent_at ? undefined : (
          <DeleteRecord
            id={record.id}
            kind="announcement"
            then="/council/announcements"
          />
        )
      }
      room={{ id: record.id, kind: "announcement" }}
      status={
        record.sent_at
          ? t("sentOn", {
              date: formatLongDate(new Date(record.sent_at), locale),
            })
          : t("draft")
      }
      title={ar ? record.title_ar : record.title_en}
    >
      <EditableSection
        form={
          record.sent_at ? undefined : (
            <Editor
              draft={{ ...record, link_path: record.link_path ?? "" }}
              key={`${record.id}-${record.tested_at ?? ""}`}
              onSaved={refresh}
            />
          )
        }
        id="words"
        title={t("words")}
      >
        <p className="type-body whitespace-pre-wrap">
          {ar ? record.body_ar : record.body_en}
        </p>
      </EditableSection>
      {president && !record.sent_at ? (
        <Sending notice={record} refresh={refresh} />
      ) : null}
      {record.sent_at ? null : <Stream notice={record} refresh={refresh} />}
      <Instagram notice={record} refresh={refresh} />
    </RecordView>
  );
};
