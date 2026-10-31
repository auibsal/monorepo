"use client";

import { useAuth } from "@repo/auth/provider";
import { Input } from "@repo/design-system/components/ui/input";
import { hasPermission } from "@repo/rbac";
import { localized, productions, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Link, useRouter } from "@/lib/nexus/navigation";
import { useGrants } from "@/lib/nexus/queries";
import { OnTheSite } from "../../site-links";
import { EmptyLine, SectionSpinner } from "../../states";
import { SectionTabs } from "../admin-shell";
import {
  AdminHeading,
  BilingualField,
  type Column,
  DataTable,
  ErrorLine,
  Field,
  SaveButton,
  SelectInput,
} from "../kit";
import { type ProductionTab, productionTabs } from "../tabs";
import { AuditionsTab, CreditsTab, RehearsalsTab } from "./company";
import { DetailsTab, RightsTab } from "./details";
import { PerformancesTab, ReportTab } from "./performances";
import { type ProductionRow, productionsKey } from "./shared";

type Stage = productions.ProductionStage;
type Kind = productions.ProductionKind;
type Origin = productions.ScriptOrigin;

const useProductionList = () => {
  const { supabase } = useAuth();
  const grants = useGrants();
  return useQuery({
    enabled: Boolean(grants.data),
    queryFn: async () =>
      (
        unwrap(
          await supabase
            .schema("programmes")
            .from("productions")
            .select("*")
            .order("created_at", { ascending: false })
        ) ?? []
      ).filter((p) =>
        hasPermission(grants.data, "productions.manage", "production", p.id)
      ),
    queryKey: productionsKey,
  });
};

const emptyProduction = {
  kind: "staged_reading" as Kind,
  playwright: "",
  script_origin: "original" as Origin,
  slug: "",
  title: { ar: "", en: "" },
};

const NewProduction = ({ onDone }: { onDone: (id: string) => void }) => {
  const t = useTranslations("nexus.admin.productions");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyProduction);
  const create = useMutation({
    mutationFn: () =>
      productions.createProduction(supabase, {
        kind: form.kind,
        playwright: form.playwright,
        script_origin: form.script_origin,
        slug: form.slug,
        title_ar: form.title.ar,
        title_en: form.title.en,
      }),
    onSuccess: async (row) => {
      setForm(emptyProduction);
      await queryClient.invalidateQueries({ queryKey: productionsKey });
      if (row) {
        onDone(row.id);
      }
    },
  });

  return (
    <form
      className="grid max-w-3xl gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate();
      }}
    >
      <h2 className="type-subheading">{t("newTitle")}</h2>
      <BilingualField
        label={t("fields.title")}
        maxLength={200}
        onChange={(title) => setForm((f) => ({ ...f, title }))}
        required
        value={form.title}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field hint={t("fields.slugHint")} label={t("fields.slug")}>
          {(id) => (
            <Input
              dir="ltr"
              id={id}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              required
              value={form.slug}
            />
          )}
        </Field>
        <Field label={t("fields.playwright")}>
          {(id) => (
            <Input
              dir="auto"
              id={id}
              maxLength={200}
              onChange={(e) =>
                setForm((f) => ({ ...f, playwright: e.target.value }))
              }
              value={form.playwright}
            />
          )}
        </Field>
        <Field label={t("fields.kind")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) =>
                setForm((f) => ({ ...f, kind: e.target.value as Kind }))
              }
              value={form.kind}
            >
              {productions.productionKinds.map((k) => (
                <option key={k} value={k}>
                  {t(`kinds.${k}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label={t("fields.origin")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  script_origin: e.target.value as Origin,
                }))
              }
              value={form.script_origin}
            >
              {productions.scriptOrigins.map((o) => (
                <option key={o} value={o}>
                  {t(`origins.${o}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
      </div>
      <SaveButton pending={create.isPending} />
      <ErrorLine error={create.error} />
    </form>
  );
};

/**
 * Productions (Nexus admin): staged readings and productions from
 * proposal to the Program Report (Form F-25, section B). The President and
 * Vice President propose them; a Production Lead runs one.
 */
export const ProductionsAdmin = () => {
  const t = useTranslations("nexus.admin.productions");
  const locale = useLocale();
  const grants = useGrants();
  const list = useProductionList();
  const canPropose = hasPermission(grants.data, "productions.manage");

  const columns: Column<ProductionRow>[] = [
    {
      cell: (p) => (
        <Link
          className="font-medium hover:underline"
          href={`/company/${p.slug ?? p.id}`}
        >
          {localized(p, "title", locale)}
        </Link>
      ),
      header: t("columns.title"),
      key: "title",
    },
    {
      cell: (p) => t(`kinds.${p.kind as Kind}`),
      header: t("columns.kind"),
      key: "kind",
    },
    {
      cell: (p) => t(`stages.${p.stage as Stage}`),
      header: t("columns.stage"),
      key: "stage",
    },
    {
      cell: (p) => t(`rights.${p.rights_status as "pending" | "cleared"}`),
      header: t("columns.rights"),
      key: "rights",
    },
  ];

  return (
    <div className="grid gap-8">
      <AdminHeading
        actions={
          <>
            <OnTheSite href="/company" />
            {canPropose ? (
              <Link className="link" href="/company/new">
                {t("new")}
              </Link>
            ) : null}
          </>
        }
        title={t("title")}
      >
        {t("lede")}
      </AdminHeading>
      {list.isPending ? <SectionSpinner /> : null}
      <DataTable
        caption={t("title")}
        columns={columns}
        empty={t("empty")}
        rowKey={(p) => p.id}
        rows={list.data ?? []}
      />
    </div>
  );
};

/**
 * One production on its own page, like its public page: /company/<slug>
 * for its details, /company/<slug>/<tab> for the rest (owner, Oct 31,
 * 2026: editing in the Diwan opens its own address); /company/new
 * proposes one.
 */
export const ProductionPage = ({
  productionRef,
  tab = "details",
}: {
  readonly productionRef: string;
  readonly tab?: ProductionTab;
}) => {
  const t = useTranslations("nexus.admin.productions");
  const locale = useLocale();
  const router = useRouter();
  const list = useProductionList();
  if (productionRef === "new") {
    return (
      <div className="grid max-w-3xl gap-8">
        <AdminHeading
          actions={
            <Link className="link" href="/company">
              {t("back")}
            </Link>
          }
          title={t("new")}
        />
        <NewProduction onDone={(id) => router.push(`/company/${id}`)} />
      </div>
    );
  }
  if (list.isPending) {
    return <SectionSpinner />;
  }
  const production = list.data?.find(
    (p) => p.slug === productionRef || p.id === productionRef
  );
  if (!production) {
    return (
      <EmptyLine action={{ href: "/company", label: t("back") }}>
        {t("missing")}
      </EmptyLine>
    );
  }
  const base = `/company/${production.slug ?? production.id}`;
  return (
    <div className="grid gap-8">
      <AdminHeading
        actions={
          <>
            <Link className="link" href="/company">
              {t("back")}
            </Link>
            {production.is_public ? <OnTheSite href={base} /> : null}
          </>
        }
        title={localized(production, "title", locale)}
      />
      <SectionTabs
        label={localized(production, "title", locale)}
        tabs={productionTabs.map((key) => ({
          href: key === "details" ? base : `${base}/${key}`,
          label: t(`tabs.${key}`),
        }))}
      />
      {tab === "details" ? <DetailsTab production={production} /> : null}
      {tab === "rights" ? <RightsTab production={production} /> : null}
      {tab === "auditions" ? <AuditionsTab production={production} /> : null}
      {tab === "credits" ? <CreditsTab production={production} /> : null}
      {tab === "rehearsals" ? <RehearsalsTab production={production} /> : null}
      {tab === "performances" ? (
        <PerformancesTab production={production} />
      ) : null}
      {tab === "report" ? <ReportTab production={production} /> : null}
    </div>
  );
};
