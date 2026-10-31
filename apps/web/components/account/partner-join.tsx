"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { localized, partners, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { ErrorLine, Field, SelectInput } from "@/components/nexus/admin/kit";
import { SignUpForm } from "@/components/nexus/auth/sign-up-form";
import { DiwanPage, DiwanSection } from "@/components/nexus/page";
import { PageSpinner } from "@/components/nexus/states";
import { useMyMembership, useProfile } from "@/lib/nexus/queries";

const PATH = "/partners/join";

/** What a partner may ask for; guest editing is the Society's to offer. */
const ASKABLE = partners.agreementGrants.filter((g) => g !== "guest_editing");

const REACHES = ["auib", "iraq", "international"] as const;

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

/** The memorandum, as the applicant signs it: their words and P11's rules. */
const Memorandum = ({ name }: { name: string }) => {
  const t = useTranslations("nexus.partnerJoin.memorandum");
  return (
    <DiwanSection id="memorandum" title={t("title")}>
      <ol className="grid list-decimal gap-3 ps-5">
        {(["one", "two", "three", "four", "five", "six"] as const).map(
          (key) => (
            <li className="type-body" key={key}>
              {t(key, { name: name || t("yourOrganization") })}
            </li>
          )
        )}
      </ol>
    </DiwanSection>
  );
};

const ApplicationForm = () => {
  const t = useTranslations("nexus.partnerJoin");
  const tr = useTranslations("nexus.admin.partners.register");
  const tg = useTranslations("nexus.admin.partners.agreements.grants");
  const locale = useLocale() as Locale;
  const { supabase, user } = useAuth();
  const profile = useProfile();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    accepted: false,
    contactRole: "",
    description: "",
    grants: [] as string[],
    kind: "club" as (typeof partners.partnerKinds)[number],
    nameAr: "",
    nameEn: "",
    partnerWill: "",
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
          grants: form.grants,
          kind: form.kind,
          name_ar: form.nameAr,
          name_en: form.nameEn,
          partner_will: form.partnerWill,
          purpose_en: form.purpose,
          reach: form.reach,
          signatory,
          url: form.url,
        })
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["partner-application", user?.id ?? ""],
      }),
  });
  const text =
    (key: "contactRole" | "description" | "partnerWill" | "purpose") =>
    (event: { target: { value: string } }) =>
      setForm((f) => ({ ...f, [key]: event.target.value }));

  return (
    <form
      className="grid gap-14"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        apply.mutate();
      }}
    >
      <DiwanSection id="organization" title={t("organization")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("nameEn")}>
            {(id) => (
              <Input
                dir="ltr"
                id={id}
                lang="en"
                maxLength={200}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nameEn: e.target.value }))
                }
                required
                value={form.nameEn}
              />
            )}
          </Field>
          <Field hint={t("optional")} label={t("nameAr")}>
            {(id) => (
              <Input
                dir="rtl"
                id={id}
                lang="ar"
                maxLength={200}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nameAr: e.target.value }))
                }
                value={form.nameAr}
              />
            )}
          </Field>
          <Field label={tr("kind")}>
            {(id) => (
              <SelectInput
                id={id}
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
            )}
          </Field>
          <Field label={tr("reach")}>
            {(id) => (
              <SelectInput
                id={id}
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
            )}
          </Field>
        </div>
        <Field hint={t("urlHint")} label={tr("url")}>
          {(id) => (
            <Input
              dir="ltr"
              id={id}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              pattern="https://.*"
              type="url"
              value={form.url}
            />
          )}
        </Field>
        <Field hint={t("descriptionHint")} label={t("description")}>
          {(id) => (
            <Textarea
              dir="auto"
              id={id}
              maxLength={1000}
              onChange={text("description")}
              rows={3}
              value={form.description}
            />
          )}
        </Field>
      </DiwanSection>

      <DiwanSection id="proposal" title={t("proposal")}>
        <Field hint={t("purposeHint")} label={t("purpose")}>
          {(id) => (
            <Textarea
              dir="auto"
              id={id}
              maxLength={2000}
              onChange={text("purpose")}
              required
              rows={4}
              value={form.purpose}
            />
          )}
        </Field>
        <Field hint={t("partnerWillHint")} label={t("partnerWill")}>
          {(id) => (
            <Textarea
              dir="auto"
              id={id}
              maxLength={4000}
              onChange={text("partnerWill")}
              rows={4}
              value={form.partnerWill}
            />
          )}
        </Field>
        <fieldset className="grid gap-3">
          <legend className="mb-2 font-medium text-sm">{t("asks")}</legend>
          {ASKABLE.map((grant) => (
            <div className="flex items-center gap-2" key={grant}>
              <Checkbox
                checked={form.grants.includes(grant)}
                id={`ask-${grant}`}
                onCheckedChange={(checked) =>
                  setForm((f) => ({
                    ...f,
                    grants:
                      checked === true
                        ? [...f.grants, grant]
                        : f.grants.filter((g) => g !== grant),
                  }))
                }
              />
              <Label htmlFor={`ask-${grant}`}>{tg(grant)}</Label>
            </div>
          ))}
        </fieldset>
      </DiwanSection>

      <Memorandum name={form.nameEn.trim()} />

      <DiwanSection id="sign" title={t("sign")}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("signatory")}>
            {(id) => <Input dir="auto" id={id} readOnly value={signatory} />}
          </Field>
          <Field label={t("signedOn")}>
            {(id) => (
              <Input
                id={id}
                readOnly
                value={formatLongDate(new Date(), locale, true)}
              />
            )}
          </Field>
          <Field label={t("contactRole")}>
            {(id) => (
              <Input
                dir="auto"
                id={id}
                maxLength={200}
                onChange={text("contactRole")}
                value={form.contactRole}
              />
            )}
          </Field>
        </div>
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
            {t("accept", {
              name: form.nameEn.trim() || t("memorandum.yourOrganization"),
            })}
          </Label>
        </div>
        <Button
          className="justify-self-start"
          disabled={apply.isPending || !form.accepted}
          type="submit"
        >
          {t("submit")}
        </Button>
        <ErrorLine error={apply.error} />
      </DiwanSection>
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
    // Applying takes an account, for whoever signs for the organization;
    // its address need not be AUIB's (owner, Oct 31, 2026).
    return (
      <DiwanPage lede={t("lede")} narrow title={t("title")}>
        <p className="type-body">{t("account")}</p>
        <div className="grid gap-6">
          <SignUpForm
            next={PATH}
            outside={{ reason: { partnerApplicant: true } }}
          />
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
    <DiwanPage lede={t("lede")} narrow title={t("title")}>
      {current ? <p className="type-body">{t("declined")}</p> : null}
      <ApplicationForm />
    </DiwanPage>
  );
};
