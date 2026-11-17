"use client";

import { ReviewStep } from "@repo/brand/components/sal/form-flow";
import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Label } from "@repo/brand/components/ui/label";
import type { Json } from "@repo/database";
import type { Locale } from "@repo/internationalization";
import {
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link, useRouter } from "@repo/internationalization/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import { ErrorLine, SelectInput } from "@/components/diwan/admin/kit";
import { PARTNER_APPLY_PATH } from "@/components/diwan/auth/sign-up-form";
import { DiwanPage } from "@/components/diwan/page";
import { PageSpinner } from "@/components/diwan/states";
import { MySignature } from "@/components/signature";
import { useAuth } from "@/lib/auth/provider";
import { localized, partners, unwrap } from "@/lib/data";
import { useGuestOf } from "@/lib/diwan/partners";
import { useMyMembership, useProfile } from "@/lib/diwan/queries";
import { FlowReceipt, FlowTerms, StatusLine, useReviewWords } from "./flow";

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
  reference: string | null;
}

/**
 * The draft, saved on the site as you go until it is sent
 * (governance.partner_application_drafts), so it follows you to another
 * device. One per person.
 */
const usePartnerDraft = () => {
  const { supabase, user } = useAuth();
  const draft = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      ((
        unwrap(
          await supabase
            .schema("api")
            .from("partner_application_drafts")
            .select("content")
            .maybeSingle()
        ) as { content: unknown } | null
      )?.content ?? null) as Record<string, unknown> | null,
    queryKey: ["partner-application-draft", user?.id ?? ""],
    staleTime: Number.POSITIVE_INFINITY,
  });
  const save = useCallback(
    async (content: Record<string, unknown>) => {
      if (!user) {
        return;
      }
      await supabase
        .schema("api")
        .from("partner_application_drafts")
        .upsert({
          content: content as { [key: string]: Json },
          user_id: user.id,
        });
    },
    [supabase, user]
  );
  const drop = async () => {
    if (!user) {
      return;
    }
    await supabase
      .schema("api")
      .from("partner_application_drafts")
      .delete()
      .eq("user_id", user.id);
  };
  return { drop, loaded: draft.isFetched, save, saved: draft.data };
};

const useMyApplication = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      ((unwrap(await supabase.schema("api").rpc("my_partner_application")) ??
        [])[0] ?? null) as Application | null,
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
    <span className="type-label text-text-secondary pt-1">
      {formatNumber(number)}.
    </span>
    <div className="type-body leading-relaxed">{children}</div>
  </li>
);

/**
 * The application is the memorandum itself (decisions.md): a live
 * contract on paper, with the organization's details as blanks filled in
 * where they stand, the Society's terms as numbered clauses, and the
 * applicant's signature (their name on the platform, in the signature
 * face, with their card number and today's date). The President signs
 * for the Society in the Diwan.
 */
const ApplicationForm = ({ onSent }: { readonly onSent: () => void }) => {
  const t = useTranslations("diwan.partnerJoin");
  const words = useReviewWords();
  const tm = useTranslations("diwan.partnerJoin.memorandum");
  const tr = useTranslations("diwan.admin.partners.register");
  const locale = useLocale() as Locale;
  const { supabase, user } = useAuth();
  const profile = useProfile();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => ({
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
  }));
  // The draft comes back once it has loaded; from then on each change is
  // saved a moment after the typing stops.
  const draft = usePartnerDraft();
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    if (draft.loaded && !restored) {
      setRestored(true);
      if (draft.saved) {
        setForm((f) => ({ ...f, ...draft.saved, accepted: false }));
      }
    }
  }, [draft.loaded, draft.saved, restored]);
  const { save: saveDraft } = draft;
  useEffect(() => {
    if (!restored) {
      return;
    }
    const timer = setTimeout(() => {
      saveDraft({ ...form, accepted: false }).catch(() => {
        // A draft that fails to save leaves the form as it is.
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [form, restored, saveDraft]);
  // A signature is the signer's name on the platform, dated today (decisions.md);
  // the database signs in that name whatever is sent.
  const signatory = profile.data
    ? localized(profile.data, "full_name", locale)
    : "";
  const apply = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase.schema("api").rpc("apply_as_partner", {
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
    onSuccess: async () => {
      await draft.drop();
      onSent();
      await queryClient.invalidateQueries({
        queryKey: ["partner-application", user?.id ?? ""],
      });
    },
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
        aria-label={tm("title")}
        className="border-line bg-surface-reading text-text grid gap-8 border p-6 sm:p-10"
        data-theme="light"
      >
        <header className="border-line grid gap-2 border-b pb-6 text-center">
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

        <footer className="border-line grid gap-8 border-t pt-6 sm:grid-cols-2">
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
            <div className="border-line flex h-24 items-end border-b border-dashed">
              <span className="type-caption text-text-secondary pb-1">
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
        <ReviewStep
          missing={form.accepted && signatory ? null : t("acceptFirst")}
          rows={[
            [t("nameEn"), form.nameEn],
            [t("nameAr"), form.nameAr],
            [tr("kind"), tr(`kinds.${form.kind}`)],
            [t("purpose"), form.purpose],
            [t("signatory"), signatory],
          ]}
          sending={apply.isPending}
          words={words}
        />
        <ErrorLine error={apply.error} />
      </div>
    </form>
  );
};

/** Signed out: the one sign-up page, back to the memorandum after. */
const ToSignUp = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace({
      pathname: "/sign-up",
      query: { next: PARTNER_APPLY_PATH },
    });
  }, [router]);
  return <PageSpinner />;
};

/**
 * The application once sent: the receipt the first time, then where it
 * stands (decisions.md, Partners: a decision at the Council's next
 * meeting, within 30 days), or the partner's dashboard once approved.
 */
const ApplicationStanding = ({
  current,
  justSent,
}: {
  readonly current: Application;
  readonly justSent: boolean;
}) => {
  const t = useTranslations("diwan.partnerJoin");
  const tr = useTranslations("diwan.flow.reply");
  const waiting = current.partner_status === "prospect";
  if (waiting && justSent) {
    return (
      <DiwanPage narrow title={t("receivedTitle")}>
        <FlowReceipt
          href="/partners/apply"
          reference={current.reference}
          reply={tr("partner")}
        />
      </DiwanPage>
    );
  }
  return (
    <DiwanPage
      narrow
      title={waiting ? t("receivedTitle") : t("partneredTitle")}
    >
      {waiting ? (
        <div className="grid gap-2">
          <StatusLine kind="partner" status={current.partner_status} />
          <p className="type-caption">
            {[current.reference, tr("partner")].filter(Boolean).join(" · ")}
          </p>
        </div>
      ) : (
        <Link className="link justify-self-start" href="/partners/dashboard">
          {t("openDesk")}
        </Link>
      )}
    </DiwanPage>
  );
};

/**
 * Partner with the Society (decisions.md): an organization signs up,
 * proposes the partnership and signs the memorandum by name; the President
 * signs for the Society in the Diwan. Whoever applied then leads the
 * partner's team, on its dashboard at /partners/dashboard.
 */
export const PartnerJoin = () => {
  const t = useTranslations("diwan.partnerJoin");
  const { loading, user } = useAuth();
  const application = useMyApplication();
  const [justSent, setJustSent] = useState(false);
  const mine = useMyMembership();
  const guestOf = useGuestOf();
  const pending = [application, mine, guestOf].some((q) => q.isPending);

  if (loading || (user && pending)) {
    return <PageSpinner />;
  }
  if (!user) {
    // Who signs comes first (decisions.md, Partners): the one sign-up
    // page, coming back here to the memorandum once the account is made
    // or signed in to.
    return <ToSignUp />;
  }
  // A member may lead their club's partnership (decisions.md). The
  // Society's own guest may apply too, and the account becomes the
  // partner's on the Council's vote (one membership); a partner's guest
  // applies with the organization's own address.
  const guest = mine.data?.kind === "guest";
  if (guest && guestOf.data?.length) {
    return (
      <DiwanPage narrow title={t("title")}>
        <p className="type-body">{t("oneMembership")}</p>
      </DiwanPage>
    );
  }
  const current = application.data;
  if (current && current.partner_status !== "ended") {
    return <ApplicationStanding current={current} justSent={justSent} />;
  }
  return (
    <DiwanPage title={t("title")}>
      <p className="type-label">{t("stepTwo")}</p>
      {current ? <p className="type-body">{t("declined")}</p> : null}
      {guest ? (
        <p className="type-body max-w-[60ch]">{t("guestNote")}</p>
      ) : null}
      <div className="max-w-4xl">
        <ApplicationForm onSent={() => setJustSent(true)} />
      </div>
      <FlowTerms kind="partner" />
    </DiwanPage>
  );
};
