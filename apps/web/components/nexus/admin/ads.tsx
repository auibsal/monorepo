"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { hasPermissionAnywhere } from "@repo/rbac";
import { localized, unwrap } from "@repo/sal-data";
import {
  type AdKind,
  adInputSchema,
  adProblem,
  type KeptAd,
  keptAds,
} from "@repo/sal-data/ads";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { Link, useRouter } from "@/lib/nexus/navigation";
import { useGrants } from "@/lib/nexus/queries";
import { useQueryParam } from "@/lib/nexus/use-query-param";
import { EmptyLine, ErrorState, SectionSpinner } from "../states";
import { ImageField } from "./image-field";
import {
  AdminHeading,
  BilingualField,
  type Column,
  ConfirmAction,
  DataTable,
  ErrorLine,
  Field,
  SelectInput,
} from "./kit";

const key = ["admin", "ads"];
const buttonLink =
  "inline-flex h-8 items-center justify-self-start rounded-md bg-primary px-3 text-primary-foreground text-sm";

const today = () => new Date().toISOString().slice(0, 10);

interface Draft {
  action: { ar: string; en: string };
  body: { ar: string; en: string };
  endsOn: string;
  headline: { ar: string; en: string };
  id: string | null;
  imageAlt: { ar: string; en: string };
  imagePath: string | null;
  kind: AdKind;
  partnerId: string;
  published: boolean;
  startsOn: string;
  url: string;
}

const pair = (en: string | null, ar: string | null) => ({
  ar: ar ?? "",
  en: en ?? "",
});

const blank = (kind: AdKind): Draft => ({
  action: pair("", ""),
  body: pair("", ""),
  endsOn: "",
  headline: pair("", ""),
  id: null,
  imageAlt: pair("", ""),
  imagePath: null,
  kind,
  partnerId: "",
  published: false,
  startsOn: today(),
  url: "",
});

const fromRow = (ad: KeptAd): Draft => ({
  action: pair(ad.action_en, ad.action_ar),
  body: pair(ad.body_en, ad.body_ar),
  endsOn: ad.ends_on ?? "",
  headline: pair(ad.headline_en, ad.headline_ar),
  id: ad.id,
  imageAlt: pair(ad.image_alt_en, ad.image_alt_ar),
  imagePath: ad.image_path,
  kind: ad.kind,
  partnerId: ad.partner_id ?? "",
  published: ad.is_published,
  startsOn: ad.starts_on,
  url: ad.url,
});

/** Which kinds of ad the signed-in officer keeps. */
const useKinds = () => {
  const grants = useGrants();
  const kinds: AdKind[] = [];
  if (hasPermissionAnywhere(grants.data, "content.manage")) {
    kinds.push("society");
  }
  if (hasPermissionAnywhere(grants.data, "partners.manage")) {
    kinds.push("sponsor");
  }
  return { kinds, ready: grants.data !== undefined };
};

/** Partners in the register, for a sponsor ad (partnership managers only). */
const usePartners = (enabled: boolean) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled,
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("partners")
          .select("id, name_en, name_ar, status")
          .order("name_en")
      ) ?? [],
    queryKey: ["admin", "ads", "partners"],
  });
};

// ── The list ────────────────────────────────────────────────────────────────

/** Administration → Ads: the Society's and sponsors' ads in Waraq. */
export const AdsAdmin = () => {
  const t = useTranslations("nexus.admin.ads");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const { kinds } = useKinds();
  const ads = useQuery({ queryFn: () => keptAds(supabase), queryKey: key });

  const state = (ad: KeptAd) => {
    if (!ad.is_published) {
      return t("states.draft");
    }
    if (ad.ends_on && ad.ends_on < today()) {
      return t("states.ended");
    }
    if (ad.starts_on > today()) {
      return t("states.scheduled", {
        date: formatLongDate(`${ad.starts_on}T12:00:00Z`, locale),
      });
    }
    return t("states.running");
  };

  const columns: Column<KeptAd>[] = [
    {
      cell: (ad) => (
        <Link className="link" href={`/qirtas/ads/${ad.id}`}>
          {localized(ad, "headline", locale) || t("untitled")}
        </Link>
      ),
      header: t("fields.headline"),
      key: "headline",
    },
    {
      cell: (ad) => t(`kinds.${ad.kind}`),
      header: t("fields.kind"),
      key: "kind",
    },
    { cell: state, header: t("fields.state"), key: "state" },
  ];

  return (
    <div className="grid gap-8">
      <AdminHeading title={t("title")}>{t("lede")}</AdminHeading>
      <div className="flex flex-wrap gap-2">
        {kinds.map((kind) => (
          <Link
            className={buttonLink}
            href={{ pathname: "/qirtas/ads/new", query: { kind } }}
            key={kind}
          >
            {t(`new.${kind}`)}
          </Link>
        ))}
      </div>
      {ads.isError ? <ErrorState onRetry={() => ads.refetch()} /> : null}
      {ads.data && ads.data.length === 0 ? (
        <EmptyLine
          action={
            kinds[0]
              ? {
                  href: `/qirtas/ads/new?kind=${kinds[0]}`,
                  label: t(`new.${kinds[0]}`),
                }
              : undefined
          }
        >
          {t("none")}
        </EmptyLine>
      ) : null}
      {ads.data && ads.data.length > 0 ? (
        <DataTable columns={columns} rowKey={(ad) => ad.id} rows={ads.data} />
      ) : null}
      {ads.isPending ? <SectionSpinner /> : null}
    </div>
  );
};

// ── The editor ──────────────────────────────────────────────────────────────

const AdForm = ({ initial }: { initial: Draft }) => {
  const t = useTranslations("nexus.admin.ads");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const publishedId = useId();
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(false);
  const partners = usePartners(draft.kind === "sponsor");
  const set = (patch: Partial<Draft>) => {
    setSaved(false);
    setDraft((d) => ({ ...d, ...patch }));
  };

  const row = adInputSchema.safeParse({
    action_ar: draft.action.ar,
    action_en: draft.action.en,
    body_ar: draft.body.ar,
    body_en: draft.body.en,
    ends_on: draft.endsOn || null,
    headline_ar: draft.headline.ar,
    headline_en: draft.headline.en,
    image_alt_ar: draft.imageAlt.ar,
    image_alt_en: draft.imageAlt.en,
    image_path: draft.imagePath,
    is_published: draft.published,
    kind: draft.kind,
    partner_id: draft.kind === "sponsor" ? draft.partnerId || null : null,
    starts_on: draft.startsOn,
    url: draft.url,
  });
  const problems = row.success
    ? []
    : [...new Set(row.error.issues.map((issue) => adProblem(issue.message)))];

  const save = useMutation({
    mutationFn: async () => {
      if (!row.success) {
        return null;
      }
      const table = supabase.schema("journal").from("ads");
      if (draft.id) {
        unwrap(await table.update(row.data).eq("id", draft.id));
        return draft.id;
      }
      return (
        unwrap(await table.insert(row.data).select("id").single())?.id ?? null
      );
    },
    onSuccess: async (id) => {
      if (!id) {
        return;
      }
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: key });
      if (!draft.id) {
        setDraft((d) => ({ ...d, id }));
        router.replace(`/qirtas/ads/${id}`);
      }
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (draft.id) {
        unwrap(
          await supabase
            .schema("journal")
            .from("ads")
            .delete()
            .eq("id", draft.id)
        );
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key });
      router.replace("/qirtas?tab=ads");
    },
  });

  return (
    <form
      className="grid max-w-3xl gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      {draft.kind === "sponsor" ? (
        <Field hint={t("partnerHint")} label={t("fields.partner")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) => set({ partnerId: e.target.value })}
              required
              value={draft.partnerId}
            >
              <option value="">{t("choosePartner")}</option>
              {(partners.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {localized(p, "name", locale)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
      ) : null}
      <BilingualField
        label={t("fields.headline")}
        maxLength={90}
        onChange={(headline) => set({ headline })}
        value={draft.headline}
      />
      <BilingualField
        label={t("fields.body")}
        maxLength={240}
        multiline
        onChange={(body) => set({ body })}
        rows={3}
        value={draft.body}
      />
      <BilingualField
        label={t("fields.action")}
        maxLength={40}
        onChange={(action) => set({ action })}
        value={draft.action}
      />
      <Field hint={t("urlHint")} label={t("fields.url")}>
        {(id) => (
          <Input
            dir="ltr"
            id={id}
            maxLength={500}
            onChange={(e) => set({ url: e.target.value })}
            required
            value={draft.url}
          />
        )}
      </Field>
      <ImageField
        area="ads"
        label={t("fields.image")}
        onChange={(imagePath) => set({ imagePath })}
        value={draft.imagePath}
      />
      {draft.imagePath ? (
        <BilingualField
          label={t("fields.imageAlt")}
          maxLength={200}
          onChange={(imageAlt) => set({ imageAlt })}
          value={draft.imageAlt}
        />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("fields.startsOn")}>
          {(id) => (
            <Input
              dir="ltr"
              id={id}
              onChange={(e) => set({ startsOn: e.target.value })}
              required
              type="date"
              value={draft.startsOn}
            />
          )}
        </Field>
        <Field hint={t("endsOnHint")} label={t("fields.endsOn")}>
          {(id) => (
            <Input
              dir="ltr"
              id={id}
              onChange={(e) => set({ endsOn: e.target.value })}
              type="date"
              value={draft.endsOn}
            />
          )}
        </Field>
      </div>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={draft.published}
          id={publishedId}
          onCheckedChange={(checked) => set({ published: checked === true })}
        />
        <div className="grid gap-1">
          <Label htmlFor={publishedId}>{t("fields.published")}</Label>
          <p className="type-caption">{t("publishedHint")}</p>
        </div>
      </div>
      {problems.length > 0 ? (
        <ul className="grid gap-1 text-sm text-text-secondary">
          {problems.map((problem) => (
            <li key={problem}>{t(`problems.${problem}`)}</li>
          ))}
        </ul>
      ) : null}
      <ErrorLine error={save.error ?? remove.error} />
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={!row.success || save.isPending} type="submit">
          {t("save")}
        </Button>
        {saved ? (
          <p className="type-caption" role="status">
            {t("saved")}
          </p>
        ) : null}
        {draft.id ? (
          <ConfirmAction
            confirmLabel={t("delete")}
            description={t("deleteConfirm")}
            disabled={remove.isPending}
            onConfirm={() => remove.mutate()}
          >
            {t("delete")}
          </ConfirmAction>
        ) : null}
      </div>
    </form>
  );
};

/** Administration → Ads → one ad (new with ?kind=, or ?id= to edit). */
export const AdEditor = () => {
  const t = useTranslations("nexus.admin.ads");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const id = useQueryParam("id");
  const kindParam = useQueryParam("kind");
  const { kinds, ready } = useKinds();
  const record = useQuery({
    enabled: id !== null,
    queryFn: async () =>
      (await keptAds(supabase)).find((ad) => ad.id === id) ?? null,
    queryKey: [...key, id],
  });
  const [initial, setInitial] = useState<Draft | null>(null);
  const newKind = kinds.find((kind) => kind === kindParam) ?? kinds[0] ?? null;
  useEffect(() => {
    if (id && record.data) {
      setInitial(fromRow(record.data));
    } else if (!id && newKind) {
      setInitial(blank(newKind));
    }
  }, [id, record.data, newKind]);

  const back = (
    <Link
      className="text-sm underline underline-offset-4"
      href="/qirtas?tab=ads"
    >
      {t("back")}
    </Link>
  );

  if (id && record.isPending) {
    return <SectionSpinner />;
  }
  if (id && record.isError) {
    return <ErrorState onRetry={() => record.refetch()} />;
  }
  if (id && !record.data) {
    return <p className="type-body text-text-secondary">{t("notFound")}</p>;
  }
  if (!(id || newKind)) {
    return ready ? (
      <p className="type-body text-text-secondary">{t("noKind")}</p>
    ) : (
      <SectionSpinner />
    );
  }
  if (!initial) {
    return <SectionSpinner />;
  }
  const title =
    (record.data && localized(record.data, "headline", locale)) ||
    t(`new.${initial.kind}`);
  return (
    <div className="grid gap-8">
      <AdminHeading actions={back} title={title}>
        {t(`editorLede.${initial.kind}`)}
      </AdminHeading>
      <AdForm initial={initial} key={initial.id ?? `new-${initial.kind}`} />
    </div>
  );
};
