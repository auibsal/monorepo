"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Label } from "@repo/design-system/components/ui/label";
import type { Locale } from "@repo/internationalization";
import {
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { localized, partners, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, Suspense, useState } from "react";
import { ErrorLine, SelectInput } from "@/components/nexus/admin/kit";
import { SignInForm } from "@/components/nexus/auth/sign-in-form";
import { SignUpForm } from "@/components/nexus/auth/sign-up-form";
import { DiwanPage, DiwanSection } from "@/components/nexus/page";
import { PageSpinner } from "@/components/nexus/states";
import { MySignature } from "@/components/signature";
import { useMyMembership, useProfile } from "@/lib/nexus/queries";

const PATH = "/partners/join";

/**
 * Where an organization outside AUIB works; an AUIB club or department is
 * at AUIB, so it is not asked.
 */
const REACHES = ["iraq", "international"] as const;
const AT_AUIB = new Set(["club", "department"]);

interface Application extends Record<string, unknown> {
  agreement_status: string;
  applied_at: string | null;
  name_ar: string | null;
  name_en: string;
  partner_status: string;
}

const useMyApplication = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      ((unwrap(
        await supabase.schema("governance").rpc("my_partner_application")
      ) ?? [])[0] ?? null) as Application | null,
    queryKey: ["partner-application", user?.id ?? ""],
  });
};

/** A blank in the memorandum, filled in where it stands. */
const blank =
  "inline-block min-w-48 border-0 border-text-secondary border-b border-dashed bg-transparent px-1 py-0.5 align-baseline text-text outline-none focus:border-accent focus:border-solid";

/** A paragraph-long blank, under its clause. */
const blankBlock =
  "mt-2 block w-full resize-y border-0 border-text-secondary border-b border-dashed bg-transparent px-1 py-1 text-text outline-none focus:border-accent focus:border-solid";

/** One numbered clause of the memorandum. */
const Clause = ({
  children,
  number,
}: {
  readonly children: ReactNode;
  readonly number: number;
}) => (
  <li className="grid grid-cols-[2rem_1fr] gap-2">
    <span className="type-label pt-1 text-text-secondary">
      {formatNumber(number)}.
    </span>
    <div className="type-body leading-relaxed">{children}</div>
  </li>
);

/**
 * The application is the memorandum itself (owner, Oct 31, 2026): a live
 * contract on paper, with the organization's details as blanks filled in
 * where they stand, the Society's terms as numbered clauses, and the
 * applicant's signature (their name on the platform, in the signature
 * face, with their card number and today's date). The President signs
 * for the Society in the Diwan.
 */
const ApplicationForm = () => {
  const t = useTranslations("nexus.partnerJoin");
  const tm = useTranslations("nexus.partnerJoin.memorandum");
  const tr = useTranslations("nexus.admin.partners.register");
  const locale = useLocale() as Locale;
  const { supabase, user } = useAuth();
  const profile = useProfile();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    accepted: false,
    contactRole: "",
    description: "",
    kind: "club" as (typeof partners.partnerKinds)[number],
    kindOther: "",
    nameAr: "",
    nameEn: "",
    purpose: "",
    reach: "iraq" as (typeof REACHES)[number],
    url: "",
  });
  // A signature is the signer's name on the platform, dated today (owner,
  // Oct 31, 2026); the database signs in that name whatever is sent.
  const signatory = profile.data
    ? localized(profile.data, "full_name", locale)
    : "";
  const apply = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase.schema("governance").rpc("apply_as_partner", {
          accepted: form.accepted,
          contact_role: form.contactRole,
          description_ar: "",
          description_en: form.description,
          kind: form.kind,
          kind_other: form.kind === "other" ? form.kindOther : "",
          name_ar: form.nameAr,
          name_en: form.nameEn,
          purpose_en: form.purpose,
          reach: AT_AUIB.has(form.kind) ? "auib" : form.reach,
          signatory,
          url: form.url,
        })
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["partner-application", user?.id ?? ""],
      }),
  });
  const set =
    (
      key:
        | "contactRole"
        | "description"
        | "kindOther"
        | "nameAr"
        | "nameEn"
        | "purpose"
        | "url"
    ) =>
    (event: { target: { value: string } }) =>
      setForm((f) => ({ ...f, [key]: event.target.value }));
  const partner = form.nameEn.trim() || tm("yourOrganization");
  const partnerStart = form.nameEn.trim() || tm("yourOrganizationStart");
  const today = formatLongDate(new Date(), locale);

  return (
    <form
      className="grid gap-10"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        apply.mutate();
      }}
    >
      {/* Paper, like a certificate: light whatever the theme. */}
      <article
        aria-labelledby="memorandum-title"
        className="grid gap-8 border border-line bg-surface-reading p-6 text-text sm:p-10"
        data-theme="light"
      >
        <header className="grid gap-2 border-line border-b pb-6 text-center">
          <p className="type-label text-text-secondary">{tm("society")}</p>
          <h2 className="type-title" id="memorandum-title">
            {tm("title")}
          </h2>
          <p className="type-caption text-text-secondary">
            {tm("dated", { date: today })}
          </p>
        </header>

        <p className="type-body leading-loose">
          {tm.rich("preamble", {
            ar: () => (
              <input
                aria-label={t("nameAr")}
                className={blank}
                dir="rtl"
                lang="ar"
                maxLength={200}
                onChange={set("nameAr")}
                placeholder={tm("nameArBlank")}
                value={form.nameAr}
              />
            ),
            date: today,
            name: () => (
              <input
                aria-label={t("nameEn")}
                className={blank}
                dir="ltr"
                lang="en"
                maxLength={200}
                onChange={set("nameEn")}
                placeholder={tm("nameBlank")}
                required
                value={form.nameEn}
              />
            ),
          })}
        </p>

        <ol className="grid gap-6">
          <Clause number={1}>
            <p>{tm("kindClause", { name: partnerStart })}</p>
            <SelectInput
              aria-label={tr("kind")}
              className="mt-2"
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  kind: e.target.value as typeof form.kind,
                }))
              }
              value={form.kind}
            >
              {partners.partnerKinds.map((kind) => (
                <option key={kind} value={kind}>
                  {tr(`kinds.${kind}`)}
                </option>
              ))}
            </SelectInput>
            {form.kind === "other" ? (
              <p className="mt-3">
                {tm.rich("kindOther", {
                  blank: () => (
                    <input
                      aria-label={t("kindOther")}
                      className={blank}
                      dir="auto"
                      maxLength={120}
                      onChange={set("kindOther")}
                      required
                      value={form.kindOther}
                    />
                  ),
                })}
              </p>
            ) : null}
            {AT_AUIB.has(form.kind) ? null : (
              <div className="mt-3">
                <p>{tm("reachClause")}</p>
                <SelectInput
                  aria-label={tr("reach")}
                  className="mt-2"
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      reach: e.target.value as typeof form.reach,
                    }))
                  }
                  value={form.reach}
                >
                  {REACHES.map((reach) => (
                    <option key={reach} value={reach}>
                      {tr(`reaches.${reach}`)}
                    </option>
                  ))}
                </SelectInput>
              </div>
            )}
          </Clause>
          <Clause number={2}>
            <p>{tm("aboutClause", { name: partnerStart })}</p>
            <textarea
              aria-label={t("description")}
              className={blankBlock}
              dir="auto"
              maxLength={1000}
              onChange={set("description")}
              placeholder={t("descriptionHint")}
              rows={3}
              value={form.description}
            />
            <p className="mt-3">
              {tm.rich("website", {
                blank: () => (
                  <input
                    aria-label={tr("url")}
                    className={blank}
                    dir="ltr"
                    onChange={set("url")}
                    pattern="https://.*"
                    placeholder={tm("urlBlank")}
                    type="url"
                    value={form.url}
                  />
                ),
              })}
            </p>
          </Clause>
          <Clause number={3}>
            <p>{tm("purposeClause", { name: partner })}</p>
            <textarea
              aria-label={t("purpose")}
              className={blankBlock}
              dir="auto"
              maxLength={2000}
              onChange={set("purpose")}
              placeholder={t("purposeHint")}
              required
              rows={5}
              value={form.purpose}
            />
          </Clause>
          {(["one", "two", "three", "four", "five", "six"] as const).map(
            (key, index) => (
              <Clause key={key} number={index + 4}>
                <p>
                  {tm(key, {
                    name:
                      key === "one" || key === "five" ? partnerStart : partner,
                  })}
                </p>
              </Clause>
            )
          )}
        </ol>

        <footer className="grid gap-8 border-line border-t pt-6 sm:grid-cols-2">
          <div className="grid content-start gap-3">
            <p className="type-label">{tm("forPartner", { name: partner })}</p>
            <MySignature />
            <p className="type-caption text-text-secondary">
              {t("signatory")}: {signatory}
            </p>
            <p className="type-body">
              {tm.rich("role", {
                blank: () => (
                  <input
                    aria-label={t("contactRole")}
                    className={blank}
                    dir="auto"
                    maxLength={200}
                    onChange={set("contactRole")}
                    value={form.contactRole}
                  />
                ),
              })}
            </p>
          </div>
          <div className="grid content-start gap-3">
            <p className="type-label">{tm("forSociety")}</p>
            <div className="flex h-24 items-end border-line border-b border-dashed">
              <span className="type-caption pb-1 text-text-secondary">
                {tm("presidentSigns")}
              </span>
            </div>
          </div>
        </footer>
      </article>

      <div className="grid gap-4">
        <div className="flex items-start gap-2">
          <Checkbox
            checked={form.accepted}
            className="mt-1"
            id="partner-accept"
            onCheckedChange={(checked) =>
              setForm((f) => ({ ...f, accepted: checked === true }))
            }
          />
          <Label htmlFor="partner-accept">
            {t("accept", { name: partner })}
          </Label>
        </div>
        <Button
          className="justify-self-start"
          disabled={apply.isPending || !form.accepted || !signatory}
          type="submit"
        >
          {t("submit")}
        </Button>
        <ErrorLine error={apply.error} />
      </div>
    </form>
  );
};

/**
 * Partner with the Society (owner, Oct 31, 2026): an organization signs up,
 * proposes the partnership and signs the memorandum by name; the President
 * signs for the Society in the Diwan. Whoever applied then leads the
 * partner's team, on its dashboard at /partners/dashboard.
 */
export const PartnerJoin = () => {
  const t = useTranslations("nexus.partnerJoin");
  const locale = useLocale() as Locale;
  const { loading, user } = useAuth();
  const application = useMyApplication();
  const mine = useMyMembership();

  if (loading || (user && (application.isPending || mine.isPending))) {
    return <PageSpinner />;
  }
  if (!user) {
    // First, who signs (owner, Oct 31, 2026): sign in, or make an account
    // for whoever signs for the organization (any address will do). A
    // member signs in as themselves and stays a member.
    return (
      <DiwanPage lede={t("lede")} title={t("title")}>
        <p className="type-label">{t("stepOne")}</p>
        <div className="grid gap-12 lg:grid-cols-2">
          <DiwanSection id="sign-in" title={t("signInTitle")}>
            <p className="type-body text-text-secondary">{t("members")}</p>
            <Suspense fallback={<PageSpinner />}>
              <SignInForm />
            </Suspense>
          </DiwanSection>
          <DiwanSection id="sign-up" title={t("signUpTitle")}>
            <p className="type-body text-text-secondary">{t("account")}</p>
            <SignUpForm
              next={PATH}
              outside={{ reason: { partnerApplicant: true } }}
            />
          </DiwanSection>
        </div>
      </DiwanPage>
    );
  }
  // A member may lead their club's partnership (owner, Oct 31, 2026); a
  // guest may not, and applies with the organization's own address.
  if (mine.data?.kind === "guest") {
    return (
      <DiwanPage lede={t("lede")} narrow title={t("title")}>
        <p className="type-body">{t("oneMembership")}</p>
      </DiwanPage>
    );
  }
  const current = application.data;
  if (current && current.partner_status !== "ended") {
    const name = localized(current, "name", locale);
    const waiting = current.partner_status === "prospect";
    return (
      <DiwanPage
        lede={
          waiting
            ? t("waiting", {
                date: current.applied_at
                  ? formatLongDate(current.applied_at, locale)
                  : "",
                name,
              })
            : t("partnered", { name })
        }
        narrow
        title={waiting ? t("receivedTitle") : t("partneredTitle")}
      >
        {waiting ? null : (
          <Link className="link justify-self-start" href="/partners/dashboard">
            {t("openDesk")}
          </Link>
        )}
      </DiwanPage>
    );
  }
  return (
    <DiwanPage lede={t("lede")} title={t("title")}>
      <p className="type-label">{t("stepTwo")}</p>
      {current ? <p className="type-body">{t("declined")}</p> : null}
      <div className="max-w-4xl">
        <ApplicationForm />
      </div>
    </DiwanPage>
  );
};
