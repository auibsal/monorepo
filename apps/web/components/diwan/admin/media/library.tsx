"use client";

import { Input } from "@repo/brand/components/ui/input";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { FileInput } from "@/components/fields/file-input";
import { useAuth } from "@/lib/auth/provider";
import { localized, unwrap } from "@/lib/data";
import { Link } from "@/lib/diwan/navigation";
import { useQueryState } from "@/lib/diwan/use-query-param";
import { getMediaUrl, uploadMedia } from "@/lib/storage";
import { DiwanSection, RowList } from "../../page";
import { EmptyLine, SectionSpinner } from "../../states";
import {
  AddInPlace,
  AdminHeading,
  ErrorLine,
  Field,
  SaveButton,
  SelectInput,
} from "../kit";
import { DeleteRecord, RecentlyDeleted } from "../recently-deleted";

const MEDIA_KINDS = ["image", "logo", "pdf", "captions", "promo"] as const;
const LICENSES = [
  "own",
  "release",
  "partner",
  "licensed",
  "public_domain",
] as const;

const mediaKey = ["admin", "media"] as const;

interface MediaItem {
  readonly alt_ar: string | null;
  readonly alt_en: string | null;
  readonly bucket: string;
  readonly caption_ar: string | null;
  readonly caption_en: string | null;
  readonly created_at: string;
  readonly credit: string | null;
  readonly event_id: string | null;
  readonly file_name: string;
  readonly id: string;
  readonly kind: string;
  readonly license: string;
  readonly path: string;
}

/** The library's items, newest first. */
const useMediaItems = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      (unwrap(
        await supabase
          .schema("api")
          .from("media_items")
          .select(
            "id, bucket, path, file_name, kind, alt_en, alt_ar, caption_en, caption_ar, credit, license, event_id, created_at"
          )
          .order("created_at", { ascending: false })
      ) ?? []) as MediaItem[],
    queryKey: [...mediaKey, "items"],
  });
};

/** A small picture of an item, or its name for a PDF or captions. */
const MediaPreview = ({ item }: { readonly item: MediaItem }) => {
  const { supabase } = useAuth();
  const t = useTranslations("diwan.admin.media");
  if (
    item.bucket !== "media" ||
    item.kind === "pdf" ||
    item.kind === "captions"
  ) {
    return (
      <span className="type-caption break-all" dir="ltr">
        {item.file_name}
      </span>
    );
  }
  return (
    // biome-ignore lint/performance/noImgElement: a preview from the media bucket, any size
    <img
      alt={item.alt_en ?? t("noAlt")}
      className="h-20 w-auto max-w-40 object-contain"
      height={80}
      src={getMediaUrl(supabase, item.path)}
      width={120}
    />
  );
};

/** Where an item is used, each record linked to its page in the Diwan. */
const Uses = ({ item }: { readonly item: MediaItem }) => {
  const t = useTranslations("diwan.admin.media");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const uses = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase.schema("api").rpc("media_uses", { item: item.id })
      ) ?? [],
    queryKey: [...mediaKey, "uses", item.id],
  });
  const hrefOf = (kind: string, ref: string) =>
    ({
      edition: `/qirtas/editions/${ref}`,
      episode: `/media/episodes/${ref}`,
      event: `/events/${ref}`,
      memorandum: `/partnerships/agreements/${ref}`,
      partner: `/partnerships/${ref}`,
      piece: `/qirtas/pieces/${ref}`,
      production: `/company/${ref}`,
    })[kind] ?? "/";
  if (!uses.data?.length) {
    return <span className="type-caption">{t("unused")}</span>;
  }
  return (
    <ul className="type-caption grid gap-1">
      {uses.data.map((use) => (
        <li key={`${use.kind}-${use.record_id}`}>
          {t(`uses.${use.kind as "event"}`)}:{" "}
          <Link className="link" href={hrefOf(use.kind, use.ref)}>
            {localized(use, "title", locale) || use.ref}
          </Link>
        </li>
      ))}
    </ul>
  );
};

/** Alt text, caption, credit and license, edited in place. */
const Describe = ({
  close,
  item,
}: {
  readonly close: () => void;
  readonly item: MediaItem;
}) => {
  const t = useTranslations("diwan.admin.media");
  const { supabase } = useAuth();
  const client = useQueryClient();
  const [form, setForm] = useState({
    alt_ar: item.alt_ar ?? "",
    alt_en: item.alt_en ?? "",
    credit: item.credit ?? "",
    license: item.license,
  });
  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("api")
          .from("media_items")
          .update({
            alt_ar: form.alt_ar || null,
            alt_en: form.alt_en || null,
            credit: form.credit || null,
            license: form.license,
          })
          .eq("id", item.id)
      ),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: mediaKey });
      close();
    },
  });
  return (
    <form
      className="grid max-w-2xl gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <Field hint={t("altHint")} label={t("altEn")}>
        {(id) => (
          <Input
            dir="ltr"
            id={id}
            lang="en"
            maxLength={500}
            onChange={(e) => setForm((f) => ({ ...f, alt_en: e.target.value }))}
            value={form.alt_en}
          />
        )}
      </Field>
      <Field label={t("altAr")}>
        {(id) => (
          <Input
            dir="rtl"
            id={id}
            lang="ar"
            maxLength={500}
            onChange={(e) => setForm((f) => ({ ...f, alt_ar: e.target.value }))}
            value={form.alt_ar}
          />
        )}
      </Field>
      <Field label={t("credit")}>
        {(id) => (
          <Input
            id={id}
            maxLength={200}
            onChange={(e) => setForm((f) => ({ ...f, credit: e.target.value }))}
            value={form.credit}
          />
        )}
      </Field>
      <Field label={t("license")}>
        {(id) => (
          <SelectInput
            id={id}
            onChange={(e) =>
              setForm((f) => ({ ...f, license: e.target.value }))
            }
            value={form.license}
          >
            {LICENSES.map((l) => (
              <option key={l} value={l}>
                {t(`licenses.${l}`)}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>
      <SaveButton pending={save.isPending} success={save.isSuccess} />
      <ErrorLine error={save.error} />
    </form>
  );
};

/** A new file for an item: every record that uses it moves to the new one. */
const Replace = ({ item }: { readonly item: MediaItem }) => {
  const t = useTranslations("diwan.admin.media");
  const { supabase } = useAuth();
  const client = useQueryClient();
  const id = useId();
  const replace = useMutation({
    mutationFn: async (file: File) => {
      const area = item.path.split("/")[0] ?? "media";
      const stored = await uploadMedia(supabase, area, file);
      unwrap(
        await supabase
          .schema("api")
          .rpc("replace_media", { item: item.id, new_path: stored.path })
      );
    },
    onSuccess: () => client.invalidateQueries(),
  });
  if (item.bucket !== "media") {
    return null;
  }
  return (
    <div className="grid gap-1">
      <label className="type-caption" htmlFor={id}>
        {replace.isPending ? t("replacing") : t("replace")}
      </label>
      <FileInput
        accept={
          item.kind === "pdf"
            ? "application/pdf"
            : "image/jpeg,image/png,image/webp"
        }
        disabled={replace.isPending}
        id={id}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            replace.mutate(file);
          }
        }}
      />
      <ErrorLine error={replace.error} />
    </div>
  );
};

/**
 * Diwan → Media → Library (decisions.md, The site: "One media library"):
 * every file uploaded on the site, filtered by kind and by whether it is
 * used, each with its words, where it is used, Replace and Delete. Unused
 * items are what the yearly audit looks at.
 */
export const MediaLibrary = () => {
  const t = useTranslations("diwan.admin.media");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const items = useMediaItems();
  const [kind, setKind] = useQueryState("kind");
  const [use, setUse] = useQueryState("use");
  const [query, setQuery] = useQueryState("q");
  const [typed, setTyped] = useState(query);
  const unused = useQuery({
    queryFn: async () =>
      new Set(
        (unwrap(await supabase.schema("api").rpc("unused_media")) ??
          []) as string[]
      ),
    queryKey: [...mediaKey, "unused"],
  });
  const [kindNow, setKindNow] = useState(kind);
  const [useNow, setUseNow] = useState(use);
  const needle = typed.trim().toLowerCase();
  const shown = (items.data ?? []).filter(
    (item) =>
      (!kindNow || item.kind === kindNow) &&
      (!useNow ||
        (useNow === "unused") === Boolean(unused.data?.has(item.id))) &&
      (!needle ||
        item.file_name.toLowerCase().includes(needle) ||
        (item.alt_en ?? "").toLowerCase().includes(needle))
  );
  return (
    <div className="grid gap-8">
      <AdminHeading title={t("title")}>{t("lede")}</AdminHeading>
      <div className="flex flex-wrap items-end gap-4">
        <Field label={t("find")}>
          {(id) => (
            <Input
              className="w-64 max-w-full"
              id={id}
              onChange={(e) => {
                setTyped(e.target.value);
                setQuery(e.target.value);
              }}
              type="search"
              value={typed}
            />
          )}
        </Field>
        <Field label={t("kind")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) => {
                setKindNow(e.target.value);
                setKind(e.target.value);
              }}
              value={kindNow}
            >
              <option value="">{t("allKinds")}</option>
              {MEDIA_KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`kinds.${k}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label={t("use")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) => {
                setUseNow(e.target.value);
                setUse(e.target.value);
              }}
              value={useNow}
            >
              <option value="">{t("allUses")}</option>
              <option value="used">{t("inUse")}</option>
              <option value="unused">{t("unusedFilter")}</option>
            </SelectInput>
          )}
        </Field>
      </div>
      {items.isPending ? <SectionSpinner /> : null}
      {items.data && shown.length === 0 ? (
        <EmptyLine>{t("empty")}</EmptyLine>
      ) : null}
      <RowList>
        {shown.map((item) => (
          <li className="grid gap-3 sm:grid-cols-[10rem_1fr]" key={item.id}>
            <MediaPreview item={item} />
            <div className="grid min-w-0 gap-2">
              <p className="type-body font-medium break-all" dir="auto">
                {item.file_name}
              </p>
              <p className="type-caption">
                {`${t(`kinds.${item.kind as "image"}`)} · ${t(`licenses.${item.license as "own"}`)} · ${formatLongDate(item.created_at, locale)}`}
              </p>
              {item.alt_en || item.alt_ar ? (
                <p className="type-caption">
                  {item.alt_en ? (
                    <span className="block" dir="ltr" lang="en">
                      {item.alt_en}
                    </span>
                  ) : null}
                  {item.alt_ar ? (
                    <span className="block" dir="rtl" lang="ar">
                      {item.alt_ar}
                    </span>
                  ) : null}
                </p>
              ) : (
                <p className="type-caption">{t("noAlt")}</p>
              )}
              <Uses item={item} />
              <div className="flex flex-wrap items-start gap-x-5 gap-y-2">
                <AddInPlace label={t("describe")}>
                  {(close) => <Describe close={close} item={item} />}
                </AddInPlace>
                <Replace item={item} />
                <DeleteRecord
                  id={item.id}
                  kind="media"
                  onDeleted={() => undefined}
                />
              </div>
            </div>
          </li>
        ))}
      </RowList>
      <RecentlyDeleted kind="media" />
      <DiwanSection id="where-files-live" title={t("whereTitle")}>
        <p className="type-body max-w-[65ch]">{t("where")}</p>
      </DiwanSection>
    </div>
  );
};

/**
 * "Choose from library" under a file field: the items of the field's kind,
 * picked in place (never a dialog).
 */
export const LibraryPicker = ({
  kinds,
  onChoose,
}: {
  readonly kinds: readonly string[];
  readonly onChoose: (path: string) => void;
}) => {
  const t = useTranslations("diwan.admin.media");
  const items = useMediaItems();
  const fits = (items.data ?? []).filter(
    (item) => item.bucket === "media" && kinds.includes(item.kind)
  );
  return (
    <AddInPlace label={t("choose")}>
      {(close) =>
        fits.length === 0 ? (
          <EmptyLine>{t("emptyKind")}</EmptyLine>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {fits.map((item) => (
              <li key={item.id}>
                <button
                  className="hover:border-accent border-line grid w-full gap-2 border p-2 text-start"
                  onClick={() => {
                    onChoose(item.path);
                    close();
                  }}
                  type="button"
                >
                  <MediaPreview item={item} />
                  <span className="type-caption break-all" dir="auto">
                    {item.alt_en || item.file_name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )
      }
    </AddInPlace>
  );
};
