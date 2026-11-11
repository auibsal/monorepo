"use client";

import { FormHeader } from "@repo/brand/components/sal/form-header";
import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import type { Database } from "@repo/database";
import { useRouter } from "@repo/internationalization/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  type FormEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/lib/auth/provider";
import { membership, names as nameParts, unwrap } from "@/lib/data";
import { isNameTaken } from "@/lib/diwan/errors";
import { safeNextPath, stripLocale } from "@/lib/diwan/navigation";
import {
  useMemberStatus,
  useMyMembership,
  useProfile,
} from "@/lib/diwan/queries";
import { MembershipCard } from "./home/membership-card";
import { ErrorState, FullPageSpinner } from "./states";

/** The Code of Conduct acknowledgment, the one pledge at sign-up (decisions §10). */
type PledgeKind = "member";

/**
 * The name in each language, in four parts as on the person's papers
 * (decisions.md): name, father's, grandfather's and last.
 */
export type Names = nameParts.FourPartNames;

type SetupStep =
  | { kind: "nameEn" }
  | { kind: "nameAr" }
  | { kind: "shownName" }
  | { kind: "pledge"; pledge: PledgeKind }
  | { kind: "photos" };

export interface SetupPlan {
  steps: SetupStep[];
  /** First setup ends on the welcome screen; a renewal goes straight on. */
  welcome: boolean;
}

/**
 * What setup still asks, one question per screen (owner, 2026-10-25): each
 * name the member hasn't given (English, then Arabic), each pledge not yet
 * made in its current version, and, the first time, whether they're happy
 * to be photographed. Everything is saved as it's answered, so a reload
 * asks only what's left. Language and email notices aren't asked: they
 * follow the language signed up in and start on (both in Settings).
 */
export const planSetup = ({
  member = true,
  nameSeen = true,
  names,
  pending,
  setupDone,
}: {
  /**
   * Whether a member has seen how their name appears (decisions.md,
   * Members: names). Until then the site shows the name given at sign-up.
   */
  nameSeen?: boolean;
  /** False for a partner's representative who is not a member: names only. */
  member?: boolean;
  names: Names;
  pending: readonly PledgeKind[];
  setupDone: boolean;
}): SetupPlan => ({
  steps: [
    ...(nameParts.partsComplete(names.en) ? [] : [{ kind: "nameEn" } as const]),
    ...(nameParts.partsComplete(names.ar) ? [] : [{ kind: "nameAr" } as const]),
    ...(member && !nameSeen ? [{ kind: "shownName" } as const] : []),
    ...(member
      ? pending.map((pledge) => ({ kind: "pledge", pledge }) as const)
      : []),
    ...(setupDone || !member ? [] : [{ kind: "photos" } as const]),
  ],
  welcome: member && !setupDone,
});

const namesFrom = (
  profile: Parameters<typeof nameParts.partsFrom>[0]
): Names => ({
  ar: nameParts.partsFrom(profile, "ar"),
  en: nameParts.partsFrom(profile, "en"),
});

const usePledgeVersions = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () => {
      // Internal versions (never shown), read only by signed-in members.
      const rows =
        unwrap(await supabase.schema("core").rpc("pledge_versions")) ?? [];
      const version = (key: string) =>
        String(rows.find((r) => r.key === key)?.value ?? "1");
      return {
        member: version("pledges.member.version"),
      } as Record<PledgeKind, string>;
    },
    queryKey: ["pledge-versions"],
  });
};

/** The step in the address, so the browser's Back button goes back. */
const STEP_PATH = /\/welcome(?:\/\d+)?$/u;
const STEP_NUMBER = /\/welcome\/(\d+)$/u;

/** Each screen at its own address: /welcome/1, /welcome/2 … */
const stepUrl = (index: number) =>
  `${window.location.pathname.replace(STEP_PATH, `/welcome/${index + 1}`)}${window.location.search}`;

type Answer =
  | { kind: "nameEn"; names: Names }
  | { kind: "nameAr"; names: Names }
  | { kind: "shownName"; preferred: { ar: string; en: string } }
  | { kind: "pledge"; pledge: PledgeKind }
  | { kind: "photos"; cameraShy: boolean };

export const SetupForm = () => {
  const t = useTranslations("diwan.setup");
  const te = useTranslations("diwan.errors");
  const { supabase, user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const next = safeNextPath(useSearchParams().get("next"));
  const status = useMemberStatus();
  const profile = useProfile();
  const versions = usePledgeVersions();
  const heading = useRef<HTMLHeadingElement>(null);
  const [plan, setPlan] = useState<SetupPlan | null>(null);
  const [names, setNames] = useState<Names>({
    ar: nameParts.emptyParts(),
    en: nameParts.emptyParts(),
  });
  const mine = useMyMembership();
  const [index, setIndex] = useState(0);
  const [welcome, setWelcome] = useState(false);

  // The plan is taken once, from what was saved when setup opened, so the
  // steps don't shift as the answers are saved.
  useEffect(() => {
    if (plan || !profile.data || !status.data || !mine.data) {
      return;
    }
    const current = namesFrom(profile.data);
    setNames(current);
    const { kind } = mine.data;
    const planned = planSetup({
      // Members and guests make the pledges; a partner's people, and
      // anyone with no membership yet, only give their names.
      member: kind === "member" || kind === "guest",
      nameSeen: kind !== "member" || Boolean(profile.data.name_confirmed_at),
      names: current,
      pending: (status.data.pending_pledges ?? []) as PledgeKind[],
      setupDone: Boolean(profile.data.setup_completed_at),
    });
    setPlan(planned);
    window.history.replaceState(null, "", stepUrl(0));
  }, [mine.data, plan, profile.data, status.data]);

  // The browser's Back and Forward move between the steps.
  useEffect(() => {
    const onPop = () => {
      const step = Number(STEP_NUMBER.exec(window.location.pathname)?.[1]);
      if (Number.isInteger(step) && step >= 1) {
        setIndex(step - 1);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Each new screen starts at the top with its question focused, without
  // the browser scrolling to the field (iPhone).
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the screen changes
  useEffect(() => {
    window.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, [index, welcome]);

  // Everyone goes on to Membership (decisions.md).
  const leave = () =>
    router.replace(next ? stripLocale(next) : "/account", {
      locale: profile.data?.locale === "ar" ? "ar" : "en",
    });

  const save = useMutation({
    mutationFn: async (answer: Answer) => {
      const update = async (
        values: Database["core"]["Tables"]["profiles"]["Update"]
      ) => {
        const { error } = await supabase
          .schema("core")
          .from("profiles")
          .update(values)
          .eq("id", user?.id ?? "");
        if (error) {
          throw error;
        }
      };
      if (answer.kind === "nameEn") {
        await update(nameParts.partsUpdate(answer.names.en, "en"));
      } else if (answer.kind === "nameAr") {
        await update(nameParts.partsUpdate(answer.names.ar, "ar"));
      } else if (answer.kind === "shownName") {
        const chosen = {
          preferred_name_ar: answer.preferred.ar.trim() || null,
          preferred_name_en: answer.preferred.en.trim() || null,
        };
        if (chosen.preferred_name_ar || chosen.preferred_name_en) {
          await update(chosen);
        }
        const { error } = await supabase
          .schema("core")
          .rpc("confirm_shown_name");
        if (error) {
          throw error;
        }
      } else if (answer.kind === "pledge") {
        await membership.acceptPledge(
          supabase,
          answer.pledge,
          versions.data?.[answer.pledge] ?? "1"
        );
      } else {
        await update({
          camera_shy: answer.cameraShy,
          setup_completed_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: async () => {
      if (!plan) {
        return;
      }
      if (index + 1 < plan.steps.length) {
        window.history.pushState(null, "", stepUrl(index + 1));
        setIndex(index + 1);
        return;
      }
      await queryClient.invalidateQueries();
      if (plan.welcome) {
        setWelcome(true);
      } else {
        leave();
      }
    },
  });

  if (status.isError || profile.isError || versions.isError) {
    return <ErrorState onRetry={() => status.refetch()} />;
  }
  if (!plan || versions.isPending) {
    return <FullPageSpinner />;
  }

  if (welcome) {
    return (
      <div className="grid gap-8">
        <h1
          className="type-display font-light outline-none"
          ref={heading}
          tabIndex={-1}
        >
          {t("welcome.title", {
            name: names.en.first.trim() || names.ar.first.trim(),
          })}
        </h1>
        <p className="type-body">{t("welcome.body")}</p>
        <MembershipCard />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Button onClick={leave} type="button">
            {t("welcome.open")}
          </Button>
        </div>
      </div>
    );
  }

  // Nothing left to ask (the gate sent them here a moment too early).
  const step = plan.steps[Math.min(index, plan.steps.length - 1)];
  if (!step) {
    leave();
    return <FullPageSpinner />;
  }

  const back =
    index > 0 ? (
      <Button
        className="px-0"
        onClick={() => window.history.back()}
        type="button"
        variant="link"
      >
        {t("back")}
      </Button>
    ) : null;
  const failed = save.isError ? (
    <p className="text-text" role="alert">
      {isNameTaken(save.error) ? te("nameTaken") : te("saveFailed")}
    </p>
  ) : null;

  return (
    <>
      <FormHeader title={t("title")}>
        {t("stepOf", {
          count: String(plan.steps.length),
          step: String(index + 1),
        })}
      </FormHeader>
      <div aria-hidden="true" className="bg-line -mt-4 h-1 w-full">
        <div
          className="bg-band h-full transition-[width]"
          style={{ width: `${((index + 1) / plan.steps.length) * 100}%` }}
        />
      </div>
      {step.kind === "nameEn" || step.kind === "nameAr" ? (
        <NameStep
          back={back}
          failed={failed}
          heading={heading}
          language={step.kind === "nameEn" ? "en" : "ar"}
          names={names}
          onChange={setNames}
          onSubmit={() => save.mutate({ kind: step.kind, names })}
          pending={save.isPending}
        />
      ) : null}
      {step.kind === "shownName" ? (
        <ShownNameStep
          back={back}
          failed={failed}
          heading={heading}
          names={names}
          onSubmit={(preferred) =>
            save.mutate({ kind: "shownName", preferred })
          }
          pending={save.isPending}
        />
      ) : null}
      {step.kind === "pledge" ? (
        <PledgeStep
          back={back}
          failed={failed}
          heading={heading}
          onAgree={() => save.mutate({ kind: "pledge", pledge: step.pledge })}
          pending={save.isPending}
          pledge={step.pledge}
          version={versions.data?.[step.pledge] ?? "1"}
        />
      ) : null}
      {step.kind === "photos" ? (
        <PhotosStep
          back={back}
          failed={failed}
          heading={heading}
          onAnswer={(cameraShy) => save.mutate({ cameraShy, kind: "photos" })}
          pending={save.isPending}
        />
      ) : null}
    </>
  );
};

interface StepProps {
  back: ReactNode;
  failed: ReactNode;
  heading: RefObject<HTMLHeadingElement | null>;
  pending: boolean;
}

const StepHeading = ({
  children,
  heading,
}: {
  children: ReactNode;
  heading: StepProps["heading"];
}) => (
  <h2
    className="type-title font-light outline-none"
    ref={heading}
    tabIndex={-1}
  >
    {children}
  </h2>
);

/** One language's four parts, as on the person's papers; Enter moves on. */
const NameStep = ({
  back,
  failed,
  heading,
  language,
  names,
  onChange,
  onSubmit,
  pending,
}: StepProps & {
  language: "en" | "ar";
  names: Names;
  onChange: (names: Names) => void;
  onSubmit: () => void;
}) => {
  const t = useTranslations("diwan.setup");
  const id = useId();
  const ready = nameParts.partsReady(names[language], language);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (ready && !pending) {
      onSubmit();
    }
  };
  return (
    <form className="grid gap-6" onSubmit={submit}>
      <div className="grid gap-2">
        <StepHeading heading={heading}>
          {language === "en" ? t("nameEn.title") : t("nameAr.title")}
        </StepHeading>
        <p className="type-body text-text-secondary" id={`${id}-hint`}>
          {t("name.hint")}
        </p>
      </div>
      <NamePartsFields
        describedBy={`${id}-hint`}
        language={language}
        onChange={(parts) => onChange({ ...names, [language]: parts })}
        parts={names[language]}
      />
      {failed}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button disabled={!ready || pending} type="submit">
          {t("continue")}
        </Button>
        {back}
      </div>
    </form>
  );
};

/** What the browser may fill: the given and family names, in English. */
const autoComplete = (language: "en" | "ar", part: nameParts.NamePart) => {
  if (language !== "en") {
    return "off";
  }
  if (part === "first") {
    return "given-name";
  }
  return part === "last" ? "family-name" : "off";
};

/**
 * The parts of a legal name in one language: the given, father's and
 * grandfather's names required, the family name where there is one; each
 * in its language's letters (the database checks the same).
 */
export const NamePartsFields = ({
  describedBy,
  language,
  onChange,
  parts,
}: {
  describedBy?: string;
  language: "en" | "ar";
  onChange: (parts: nameParts.NameParts) => void;
  parts: nameParts.NameParts;
}) => {
  const t = useTranslations("diwan.setup.name");
  const id = useId();
  const wrongScript = !nameParts.partsInScript(parts, language);
  return (
    <div className="grid max-w-xl gap-4 sm:grid-cols-2">
      {nameParts.nameParts.map((part) => (
        <div className="grid gap-2" key={part}>
          <Label htmlFor={`${id}-${part}`}>{t(`parts.${part}`)}</Label>
          <Input
            aria-describedby={
              [describedBy, wrongScript ? `${id}-script` : null]
                .filter(Boolean)
                .join(" ") || undefined
            }
            aria-invalid={!nameParts.inScript(parts[part], language)}
            autoComplete={autoComplete(language, part)}
            dir={language === "en" ? "ltr" : "rtl"}
            id={`${id}-${part}`}
            lang={language}
            maxLength={60}
            onChange={(event) =>
              onChange({ ...parts, [part]: event.target.value })
            }
            required={nameParts.requiredParts.includes(part)}
            value={parts[part]}
          />
        </div>
      ))}
      {wrongScript ? (
        <p
          className="type-caption sm:col-span-2"
          id={`${id}-script`}
          role="alert"
        >
          {t(`script.${language}`)}
        </p>
      ) : null}
    </div>
  );
};

/**
 * How the member's name appears on the site (decisions.md, Members: names):
 * the default, the given and father's names in each language, to keep or
 * change before it is shown, in place of a 14-day notice.
 */
const ShownNameStep = ({
  back,
  failed,
  heading,
  names,
  onSubmit,
  pending,
}: StepProps & {
  names: Names;
  onSubmit: (preferred: { ar: string; en: string }) => void;
}) => {
  const t = useTranslations("diwan.setup.shownName");
  const id = useId();
  const [changing, setChanging] = useState(false);
  const [preferred, setPreferred] = useState({ ar: "", en: "" });
  const ready =
    nameParts.inScript(preferred.en, "en") &&
    nameParts.inScript(preferred.ar, "ar");
  return (
    <form
      className="grid gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (ready) {
          onSubmit(changing ? preferred : { ar: "", en: "" });
        }
      }}
    >
      <div className="grid gap-2">
        <StepHeading heading={heading}>{t("title")}</StepHeading>
        <p className="type-body text-text-secondary">{t("why")}</p>
      </div>
      <dl className="border-line grid border-y">
        {(["en", "ar"] as const).map((lang) => (
          <div className="grid gap-1 py-3" key={lang}>
            <dt className="type-label">{t(lang)}</dt>
            <dd dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
              {nameParts.displayName(names[lang])}
            </dd>
          </div>
        ))}
      </dl>
      {changing ? (
        <div className="grid max-w-xl gap-4">
          {(["en", "ar"] as const).map((lang) => (
            <div className="grid gap-2" key={lang}>
              <Label htmlFor={`${id}-${lang}`}>{t(`preferred.${lang}`)}</Label>
              <Input
                aria-invalid={!nameParts.inScript(preferred[lang], lang)}
                dir={lang === "ar" ? "rtl" : "ltr"}
                id={`${id}-${lang}`}
                lang={lang}
                maxLength={120}
                onChange={(event) =>
                  setPreferred((p) => ({ ...p, [lang]: event.target.value }))
                }
                placeholder={nameParts.displayName(names[lang])}
                value={preferred[lang]}
              />
            </div>
          ))}
          <p className="type-caption">{t("hint")}</p>
        </div>
      ) : null}
      {failed}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button disabled={pending || !ready} type="submit">
          {changing ? t("save") : t("keep")}
        </Button>
        {changing ? null : (
          <Button
            onClick={() => setChanging(true)}
            type="button"
            variant="link"
          >
            {t("change")}
          </Button>
        )}
        {back}
      </div>
    </form>
  );
};

/** A pledge to read, and one "I agree". */
const PledgeStep = ({
  back,
  failed,
  heading,
  onAgree,
  pending,
  pledge,
  version,
}: StepProps & {
  onAgree: () => void;
  pledge: PledgeKind;
  version: string;
}) => {
  const t = useTranslations("diwan.setup");
  const key = pledge;
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <StepHeading heading={heading}>{t(`${key}.title`)}</StepHeading>
        <p className="type-body text-text-secondary">{t(`${key}.why`)}</p>
      </div>
      <blockquote className="type-body border-line ps-space-4 border-s-2">
        {t(`${key}.body`)}
      </blockquote>
      <p className="type-caption type-code">v{version}</p>
      {failed}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button disabled={pending} onClick={onAgree} type="button">
          {t(`${key}.accept`)}
        </Button>
        {back}
      </div>
    </div>
  );
};

/** Consent to be photographed: a yes or a no, both one tap. */
const PhotosStep = ({
  back,
  failed,
  heading,
  onAnswer,
  pending,
}: StepProps & { onAnswer: (cameraShy: boolean) => void }) => {
  const t = useTranslations("diwan.setup");
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <StepHeading heading={heading}>{t("photos.title")}</StepHeading>
        <p className="type-body text-text-secondary">{t("photos.body")}</p>
      </div>
      {failed}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button
          disabled={pending}
          onClick={() => onAnswer(false)}
          type="button"
        >
          {t("photos.yes")}
        </Button>
        <Button
          className="px-0"
          disabled={pending}
          onClick={() => onAnswer(true)}
          type="button"
          variant="link"
        >
          {t("photos.no")}
        </Button>
        {back}
      </div>
    </div>
  );
};
