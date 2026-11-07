"use client";

import { useAuth } from "@repo/auth/provider";
import { SalCard } from "@repo/brand/components/sal/card";
import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import type { Locale } from "@repo/internationalization";
import {
  formatDateTime,
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { hasPermission, type ScopeType, scopeTypes } from "@repo/rbac";
import { access, localized, membership, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { callApi } from "@/lib/diwan/api";
import { Link } from "@/lib/diwan/navigation";
import { useGrants } from "@/lib/diwan/queries";
import { useQueryParam } from "@/lib/diwan/use-query-param";
import { ErrorState, SectionSpinner } from "../../states";
import {
  AddInPlace,
  AdminHeading,
  BilingualField,
  type Column,
  ConfirmAction,
  DataTable,
  DateTimeField,
  ErrorLine,
  Field,
  SaveButton,
  SelectInput,
} from "../kit";
import { NotionManaged } from "../notion-managed";
import { memberName, useDirectory } from "./directory";

// ── Scope options (series, events, Editions, productions) ────────

const useScopeOptions = () => {
  const { supabase } = useAuth();
  const locale = useLocale();
  return useQuery({
    queryFn: async () => {
      const [programmes, issues, shows, partnerRows, eventRows] =
        await Promise.all([
          supabase
            .schema("core")
            .from("programmes")
            .select("id, name_en, name_ar")
            .order("sort"),
          supabase
            .schema("journal")
            .from("issues")
            .select("id, volume, number, title_en, title_ar")
            .order("volume", { ascending: false })
            .order("number", { ascending: false }),
          supabase
            .schema("programmes")
            .from("productions")
            .select("id, title_en, title_ar")
            .order("created_at", { ascending: false }),
          // A partner's representatives (partner_rep) hold their role for it.
          supabase
            .schema("governance")
            .from("partners")
            .select("id, name_en, name_ar")
            .order("name_en"),
          // An event lead may hold the role for one event (owner, Nov 5,
          // 2026): the events from a month ago on.
          supabase
            .schema("events")
            .from("events")
            .select("id, title_en, title_ar, starts_at")
            .gte("starts_at", new Date(Date.now() - 30 * 864e5).toISOString())
            .order("starts_at")
            .limit(200),
        ]);
      const options: Record<
        Exclude<ScopeType, "global">,
        { id: string; label: string }[]
      > = {
        event: (unwrap(eventRows) ?? []).map((e) => ({
          id: e.id,
          label: `${localized(e, "title", locale)} · ${formatLongDate(e.starts_at, locale as Locale)}`,
        })),
        issue: (unwrap(issues) ?? []).map((i) => ({
          id: i.id,
          label: `${i.volume}.${i.number} · ${localized(i, "title", locale)}`,
        })),
        partner: (unwrap(partnerRows) ?? []).map((p) => ({
          id: p.id,
          label: localized(p, "name", locale),
        })),
        production: (unwrap(shows) ?? []).map((p) => ({
          id: p.id,
          label: localized(p, "title", locale),
        })),
        programme: (unwrap(programmes) ?? []).map((p) => ({
          id: p.id,
          label: localized(p, "name", locale),
        })),
      };
      return options;
    },
    queryKey: ["admin", "scope-options", locale],
  });
};

// ── Tier ────────────────────────────────────────────────────────────────────

const TierForm = ({
  tier,
  userId,
}: {
  tier: membership.Tier;
  userId: string;
}) => {
  const t = useTranslations("diwan.admin.member");
  const tt = useTranslations("diwan.home.tiers");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [value, setValue] = useState(tier);
  const save = useMutation({
    mutationFn: () => membership.setTier(supabase, userId, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin"] }),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  return (
    <form className="flex flex-wrap items-end gap-3" onSubmit={submit}>
      <Field label={t("tier")}>
        {(id) => (
          <SelectInput
            className="w-48"
            id={id}
            onChange={(e) => setValue(e.target.value as membership.Tier)}
            value={value}
          >
            {membership.tiers.map((option) => (
              <option key={option} value={option}>
                {tt(option)}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>
      <SaveButton
        disabled={value === tier}
        pending={save.isPending}
        success={save.isSuccess && value === tier}
      />
      <ErrorLine error={save.error} />
    </form>
  );
};

// ── Activity records ────────────────────────────────────────────────────────

const ActivitySection = ({ userId }: { userId: string }) => {
  const t = useTranslations("diwan.admin.member");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const records = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("membership")
          .from("activity_records")
          .select("id, occurred_at")
          .eq("user_id", userId)
          .order("occurred_at", { ascending: false })
      ) ?? [],
    queryKey: ["admin", "activity-records", userId],
  });

  type Record = NonNullable<typeof records.data>[number];
  const columns: Column<Record>[] = [
    {
      cell: (r) => formatDateTime(r.occurred_at, locale),
      className: "whitespace-nowrap",
      header: t("when"),
      key: "when",
    },
    {
      cell: () => t("kinds.check_in"),
      header: t("activity"),
      key: "kind",
    },
  ];

  return (
    <section className="grid gap-4">
      <h2 className="type-heading">{t("activity")}</h2>
      <p className="type-body text-text-secondary">{t("activityLede")}</p>
      {records.isPending ? <SectionSpinner /> : null}
      {records.data ? (
        <DataTable columns={columns} rowKey={(r) => r.id} rows={records.data} />
      ) : null}
    </section>
  );
};

// ── Roles ───────────────────────────────────────────────────────────────────

const RolesSection = ({ name, userId }: { name: string; userId: string }) => {
  const t = useTranslations("diwan.admin.member");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const grants = useGrants();
  const canAssign = hasPermission(grants.data, "roles.assign");
  const roles = useQuery({
    queryFn: () => access.roles(supabase),
    queryKey: ["admin", "roles"],
  });
  const scopes = useScopeOptions();
  const assignments = useQuery({
    queryFn: () => access.assignmentsFor(supabase, userId),
    queryKey: ["admin", "assignments", userId],
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin"] });
  const end = useMutation({
    mutationFn: (assignmentId: string) =>
      access.endRoleAssignment(supabase, assignmentId),
    onSuccess: invalidate,
  });

  const confirm = useMutation({
    mutationFn: (assignmentId: string) =>
      access.confirmAssignment(supabase, assignmentId),
    onSuccess: invalidate,
  });
  const seatCheck = useMutation({
    mutationFn: ({ eligible, id }: { eligible: boolean; id: string }) =>
      access.recordSeatCheck(supabase, id, eligible),
    onSuccess: invalidate,
  });
  const isCouncil = (key: string) =>
    roles.data?.find((r) => r.key === key)?.is_council ?? false;

  const roleName = (key: string) => {
    const role = roles.data?.find((r) => r.key === key);
    return role ? localized(role, "name", locale) : key;
  };
  const scopeName = (type: string, id: string | null) => {
    if (type === "global" || !id) {
      return t("scopes.global");
    }
    const item = scopes.data?.[type as Exclude<ScopeType, "global">]?.find(
      (o) => o.id === id
    );
    return `${t(`scopes.${type as ScopeType}`)}: ${item?.label ?? "—"}`;
  };

  type Assignment = NonNullable<typeof assignments.data>[number];
  const now = new Date();
  const state = (a: Assignment) => {
    if (access.isActiveAssignment(a, now)) {
      // New team members and appointees serve their first term on
      // probation, then are confirmed (owner, Nov 7, 2026).
      return a.confirmed_at ? t("active") : t("probation");
    }
    return new Date(a.starts_at) > now ? t("upcoming") : t("ended");
  };
  const columns: Column<Assignment>[] = [
    {
      cell: (a) => (
        <span>
          {roleName(a.role)}
          {a.title_en || a.title_ar ? (
            <span className="type-caption block">
              {localized(a, "title", locale)}
            </span>
          ) : null}
        </span>
      ),
      header: t("role"),
      key: "role",
    },
    {
      cell: (a) => scopeName(a.scope_type, a.scope_id),
      header: t("scope"),
      key: "scope",
    },
    {
      cell: (a) => formatLongDate(a.starts_at, locale, true),
      className: "whitespace-nowrap",
      header: t("starts"),
      key: "starts",
    },
    {
      cell: (a) => (a.ends_at ? formatLongDate(a.ends_at, locale, true) : "—"),
      className: "whitespace-nowrap",
      header: t("ends"),
      key: "ends",
    },
    { cell: state, header: "", key: "state" },
    {
      cell: (a) =>
        canAssign && access.isActiveAssignment(a, now) && !a.confirmed_at ? (
          <span className="flex flex-wrap gap-2">
            {isCouncil(a.role) && !a.student_life_answer ? (
              <>
                <Button
                  disabled={seatCheck.isPending}
                  onClick={() => seatCheck.mutate({ eligible: true, id: a.id })}
                  size="sm"
                  variant="ghost"
                >
                  {t("studentLifeEligible")}
                </Button>
                <Button
                  disabled={seatCheck.isPending}
                  onClick={() =>
                    seatCheck.mutate({ eligible: false, id: a.id })
                  }
                  size="sm"
                  variant="ghost"
                >
                  {t("studentLifeNotEligible")}
                </Button>
              </>
            ) : (
              <Button
                disabled={confirm.isPending}
                onClick={() => confirm.mutate(a.id)}
                size="sm"
                variant="ghost"
              >
                {t("confirmRole")}
              </Button>
            )}
          </span>
        ) : null,
      header: "",
      key: "confirm",
    },
    {
      cell: (a) =>
        canAssign && access.isActiveAssignment(a, now) ? (
          <ConfirmAction
            confirmLabel={t("endRole")}
            description={t("endRoleConfirm")}
            disabled={end.isPending}
            onConfirm={() => end.mutate(a.id)}
          >
            {t("endRole")}
          </ConfirmAction>
        ) : null,
      header: "",
      key: "actions",
    },
  ];

  return (
    <section className="grid gap-4">
      <h2 className="type-heading">{t("roles")}</h2>
      <p className="type-body text-text-secondary">{t("rolesLede")}</p>
      {assignments.isPending ? <SectionSpinner /> : null}
      {assignments.data ? (
        <DataTable
          columns={columns}
          empty={t("noRoles")}
          rowKey={(a) => a.id}
          rows={assignments.data}
        />
      ) : null}
      {canAssign ? (
        <AddInPlace label={t("assign")}>
          {(close) => <AssignRole name={name} onDone={close} userId={userId} />}
        </AddInPlace>
      ) : null}
      <ErrorLine error={end.error ?? confirm.error ?? seatCheck.error} />
    </section>
  );
};

/**
 * A role assigned on its own page under the member's page (owner, Nov 4,
 * 2026; added in place since §26); confirmed before it counts.
 */
const AssignRole = ({
  name,
  onDone,
  userId,
}: {
  readonly name: string;
  readonly onDone: () => void;
  readonly userId: string;
}) => {
  const t = useTranslations("diwan.admin.member");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const roles = useQuery({
    queryFn: () => access.roles(supabase),
    queryKey: ["admin", "roles"],
  });
  const scopes = useScopeOptions();
  const empty = {
    ends_at: null as string | null,
    exception_resolution: "",
    note: "",
    role_key: "",
    scope_id: "",
    scope_type: "global" as ScopeType,
    starts_at: new Date().toISOString(),
    title: { ar: "", en: "" },
  };
  const [form, setForm] = useState(empty);

  const assign = useMutation({
    mutationFn: () =>
      access.assignRole(supabase, {
        ends_at: form.ends_at,
        exception_resolution: form.exception_resolution || null,
        note: form.note,
        role_key: form.role_key,
        scope_id: form.scope_type === "global" ? null : form.scope_id || null,
        scope_type: form.scope_type,
        starts_at: form.starts_at,
        target_user: userId,
        title_ar: form.title.ar,
        title_en: form.title.en,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      onDone();
    },
  });
  const brokenRule = access.brokenRoleRule(assign.error);
  const resolutions = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("resolutions")
          .select("id, code, title_en, title_ar")
          .eq("status", "adopted")
          .eq("body", "council")
          .order("adopted_on", { ascending: false })
      ) ?? [],
    queryKey: ["admin", "council-resolutions"],
  });
  const roleName = (key: string) => {
    const role = roles.data?.find((r) => r.key === key);
    return role ? localized(role, "name", locale) : key;
  };
  const scopeChoices =
    form.scope_type === "global" ? [] : (scopes.data?.[form.scope_type] ?? []);
  const ready =
    form.role_key !== "" &&
    (form.scope_type === "global" || form.scope_id !== "");

  return (
    <form
      className="grid max-w-3xl gap-4"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("role")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) =>
                setForm((f) => ({ ...f, role_key: e.target.value }))
              }
              required
              value={form.role_key}
            >
              <option value="">{t("choose")}</option>
              {roles.data?.map((role) => (
                <option key={role.key} value={role.key}>
                  {localized(role, "name", locale)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label={t("scope")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  scope_id: "",
                  scope_type: e.target.value as ScopeType,
                }))
              }
              value={form.scope_type}
            >
              {scopeTypes.map((type) => (
                <option key={type} value={type}>
                  {t(`scopes.${type}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        {form.scope_type === "global" ? null : (
          <Field label={t("scopeItem")}>
            {(id) => (
              <SelectInput
                id={id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, scope_id: e.target.value }))
                }
                required
                value={form.scope_id}
              >
                <option value="">{t("choose")}</option>
                {scopeChoices.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <DateTimeField
          label={t("starts")}
          onChange={(v) =>
            setForm((f) => ({ ...f, starts_at: v ?? f.starts_at }))
          }
          required
          value={form.starts_at}
        />
        <DateTimeField
          label={t("ends")}
          onChange={(v) => setForm((f) => ({ ...f, ends_at: v }))}
          value={form.ends_at}
        />
      </div>
      <BilingualField
        label={t("titleLabel")}
        maxLength={120}
        onChange={(title) => setForm((f) => ({ ...f, title }))}
        value={form.title}
      />
      <Field label={t("note")}>
        {(id) => (
          <Input
            id={id}
            maxLength={500}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            value={form.note}
          />
        )}
      </Field>
      <Field hint={t("exceptionHint")} label={t("exception")}>
        {(id) => (
          <SelectInput
            id={id}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                exception_resolution: e.target.value,
              }))
            }
            value={form.exception_resolution}
          >
            <option value="">{t("noException")}</option>
            {(resolutions.data ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.code} · {localized(r, "title", locale)}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>
      <div>
        <ConfirmAction
          confirmLabel={t("assignButton")}
          description={t("assignConfirm", {
            name,
            role: roleName(form.role_key),
          })}
          disabled={!ready || assign.isPending}
          onConfirm={() => assign.mutate()}
          variant="default"
        >
          {t("assignButton")}
        </ConfirmAction>
      </div>
      {brokenRule ? (
        <p className="text-sm text-text" role="alert">
          {t(`rules.${brokenRule}`)}
        </p>
      ) : (
        <ErrorLine error={assign.error} />
      )}
    </form>
  );
};

// ── Two-step sign-in ────────────────────────────────────────────────────────

/**
 * For whoever assigns roles: clears someone's authenticator app and recovery
 * codes when they lost their phone and have no code left. They set up new
 * ones at their next sign-in; the reset is recorded and they are emailed.
 */
const TwoStepReset = ({ name, userId }: { name: string; userId: string }) => {
  const t = useTranslations("diwan.admin.member.twoStep");
  const { supabase } = useAuth();
  const reset = useMutation({
    mutationFn: () => callApi(supabase, "/two-step/reset", { userId }),
  });
  return (
    <section className="grid gap-3">
      <h2 className="type-heading">{t("title")}</h2>
      <p className="type-body max-w-2xl text-text-secondary">{t("body")}</p>
      <div>
        <ConfirmAction
          confirmLabel={t("confirm")}
          description={t("description", { name })}
          disabled={reset.isPending}
          onConfirm={() => reset.mutate()}
        >
          {t("reset")}
        </ConfirmAction>
      </div>
      {reset.isSuccess ? (
        <p className="type-body" role="status">
          {t("done", { name })}
        </p>
      ) : null}
      <ErrorLine error={reset.error} />
    </section>
  );
};

// ── Page ────────────────────────────────────────────────────────────────────

export const MemberDetail = () => {
  const t = useTranslations("diwan.admin.member");
  const tm = useTranslations("diwan.admin.members");
  const tk = useTranslations("diwan.admin.kit");
  const th = useTranslations("diwan.home");
  const locale = useLocale() as Locale;
  const userId = useQueryParam("id");
  const { user } = useAuth();
  const grants = useGrants();
  const directory = useDirectory();

  if (directory.isPending) {
    return <SectionSpinner />;
  }
  if (directory.isError) {
    return <ErrorState onRetry={() => directory.refetch()} />;
  }

  const row = directory.data.find((r) => r.user_id === userId);
  if (!(row && userId)) {
    return <p className="type-body text-text-secondary">{t("notFound")}</p>;
  }
  const name = memberName(row, locale) || tm("unnamed");
  const canManage = hasPermission(grants.data, "members.manage");
  const canAssign = hasPermission(grants.data, "roles.assign");

  return (
    <div className="grid gap-10">
      <AdminHeading
        actions={
          <Link
            className="text-sm underline underline-offset-4"
            href="/membership"
          >
            {tk("back")}
          </Link>
        }
        title={name}
      >
        <span dir="ltr">{row.email}</span>
      </AdminHeading>
      <NotionManaged kind="officer" recordId={userId} />
      <SalCard>
        <dl className="grid gap-3 sm:grid-cols-4">
          <div>
            <dt className="type-label">{tm("columns.since")}</dt>
            <dd>
              {row.member_since
                ? formatLongDate(row.member_since, locale, true)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="type-label">{tm("columns.status")}</dt>
            <dd>{row.verified_at ? tm("verified") : tm("unverified")}</dd>
          </div>
          <div>
            <dt className="type-label">{tm("columns.activities")}</dt>
            <dd className="tabular-nums">{formatNumber(row.activities)}</dd>
          </div>
          <div>
            <dt className="type-label">{tm("columns.voting")}</dt>
            <dd>
              {row.voting_member ? th("card.voting") : th("card.notVoting")}
            </dd>
          </div>
        </dl>
      </SalCard>
      {canManage && row.tier ? (
        <TierForm tier={row.tier} userId={userId} />
      ) : null}
      {canManage ? <ActivitySection userId={userId} /> : null}
      <RolesSection name={name} userId={userId} />
      {canAssign && userId !== user?.id ? (
        <TwoStepReset name={name} userId={userId} />
      ) : null}
    </div>
  );
};
