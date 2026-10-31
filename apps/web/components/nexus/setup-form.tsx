"use client";

import { useAuth } from "@repo/auth/provider";
import type { Database } from "@repo/database";
import { FormHeader } from "@repo/design-system/components/sal/form-header";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Link, useRouter } from "@repo/internationalization/navigation";
import { membership, unwrap } from "@repo/sal-data";
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
import { safeNextPath, stripLocale } from "@/lib/nexus/navigation";
import { useMemberStatus, useProfile } from "@/lib/nexus/queries";
import { MembershipCard } from "./home/membership-card";
import { ErrorState, FullPageSpinner } from "./states";

type PledgeKind = "human_authorship" | "member";

const SPACES = /\s+/;

/** The name in each language, each whole (owner, Oct 31, 2026). */
export interface Names {
  ar: string;
  en: string;
}

export type SetupStep =
  | { kind: "nameEn" }
  | { kind: "nameAr" }
  | { kind: "pledge"; pledge: PledgeKind }
  | { kind: "photos" };

export interface SetupPlan {
  steps: SetupStep[];
  /** First setup ends on the welcome screen; a renewal goes straight on. */
  welcome: boolean;
}

/** The first word of a name, for a greeting. */
const firstWord = (name: string) => name.trim().split(SPACES)[0] ?? "";

const filled = (...parts: string[]) =>
  parts.every((part) => part.trim() !== "");

/**
 * What setup still asks, one question per screen (owner, 2026-10-25): each
 * name the member hasn't given (English, then Arabic), each pledge not yet
 * made in its current version, and, the first time, whether they're happy
 * to be photographed. Everything is saved as it's answered, so a reload
 * asks only what's left. Language and email notices aren't asked: they
 * follow the language signed up in and start on (both in Settings).
 */
export const planSetup = ({
  names,
  pending,
  setupDone,
}: {
  names: Names;
  pending: readonly PledgeKind[];
  setupDone: boolean;
}): SetupPlan => ({
  steps: [
    ...(filled(names.en) ? [] : [{ kind: "nameEn" } as const]),
    ...(filled(names.ar) ? [] : [{ kind: "nameAr" } as const]),
    ...pending.map((pledge) => ({ kind: "pledge", pledge }) as const),
    ...(setupDone ? [] : [{ kind: "photos" } as const]),
  ],
  welcome: !setupDone,
});

const namesFrom = (profile: {
  full_name_ar: string | null;
  full_name_en: string;
}): Names => ({ ar: profile.full_name_ar ?? "", en: profile.full_name_en });

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
        human_authorship: version("pledges.human_authorship.version"),
        member: version("pledges.member.version"),
      } as Record<PledgeKind, string>;
    },
    queryKey: ["pledge-versions"],
  });
};

/** The step in the address, so the browser's Back button goes back. */
const STEP_PATH = /\/welcome(?:\/\d+)?$/;
const STEP_NUMBER = /\/welcome\/(\d+)$/;

/** Each screen at its own address: /welcome/1, /welcome/2 … */
const stepUrl = (index: number) =>
  `${window.location.pathname.replace(STEP_PATH, `/welcome/${index + 1}`)}${window.location.search}`;

type Answer =
  | { kind: "nameEn"; names: Names }
  | { kind: "nameAr"; names: Names }
  | { kind: "pledge"; pledge: PledgeKind }
  | { kind: "photos"; cameraShy: boolean };

export const SetupForm = () => {
  const t = useTranslations("nexus.setup");
  const te = useTranslations("nexus.errors");
  const { supabase, user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const next = safeNextPath(useSearchParams().get("next"));
  const status = useMemberStatus();
  const profile = useProfile();
  const versions = usePledgeVersions();
  const heading = useRef<HTMLHeadingElement>(null);
  const [plan, setPlan] = useState<SetupPlan | null>(null);
  const [names, setNames] = useState<Names>({ ar: "", en: "" });
  const [index, setIndex] = useState(0);
  const [welcome, setWelcome] = useState(false);

  // The plan is taken once, from what was saved when setup opened, so the
  // steps don't shift as the answers are saved.
  useEffect(() => {
    if (plan || !profile.data || !status.data) {
      return;
    }
    const current = namesFrom(profile.data);
    setNames(current);
    setPlan(
      planSetup({
        names: current,
        pending: (status.data.pending_pledges ?? []) as PledgeKind[],
        setupDone: Boolean(profile.data.setup_completed_at),
      })
    );
    window.history.replaceState(null, "", stepUrl(0));
  }, [plan, profile.data, status.data]);

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

  const leave = () =>
    router.replace(next ? stripLocale(next) : "/membership", {
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
        await update({ full_name_en: answer.names.en.trim() });
      } else if (answer.kind === "nameAr") {
        await update({ full_name_ar: answer.names.ar.trim() });
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
            name: firstWord(names.en) || firstWord(names.ar),
          })}
        </h1>
        <p className="type-body">{t("welcome.body")}</p>
        <MembershipCard />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Button onClick={leave} type="button">
            {t("welcome.open")}
          </Button>
          <Link className="link" href="/membership/settings/more">
            {t("welcome.more")}
          </Link>
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
      {te("saveFailed")}
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
      <div aria-hidden="true" className="-mt-4 h-1 w-full bg-line">
        <div
          className="h-full bg-band transition-[width]"
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

/** One language's first and last name; Enter moves on. */
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
  const t = useTranslations("nexus.setup");
  const id = useId();
  const ready = filled(names[language]);
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
      <div className="grid max-w-md gap-2">
        <Label htmlFor={`${id}-name`}>
          {language === "en" ? t("name.en") : t("name.ar")}
        </Label>
        <Input
          aria-describedby={`${id}-hint`}
          autoComplete={language === "en" ? "name" : "off"}
          dir={language === "en" ? "ltr" : "rtl"}
          id={`${id}-name`}
          lang={language}
          maxLength={120}
          onChange={(event) =>
            onChange({ ...names, [language]: event.target.value })
          }
          required
          value={names[language]}
        />
      </div>
      {failed}
      <div className="flex items-center gap-6">
        <Button disabled={!ready || pending} type="submit">
          {t("continue")}
        </Button>
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
  const t = useTranslations("nexus.setup");
  const key = pledge === "human_authorship" ? "humanAuthorship" : "member";
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <StepHeading heading={heading}>{t(`${key}.title`)}</StepHeading>
        <p className="type-body text-text-secondary">{t(`${key}.why`)}</p>
      </div>
      <blockquote className="type-body border-line border-s-2 ps-space-4">
        {t(`${key}.body`)}
      </blockquote>
      <p className="type-caption type-code">v{version}</p>
      {failed}
      <div className="flex items-center gap-6">
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
  const t = useTranslations("nexus.setup");
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <StepHeading heading={heading}>{t("photos.title")}</StepHeading>
        <p className="type-body text-text-secondary">{t("photos.body")}</p>
      </div>
      {failed}
      <div className="grid justify-items-start gap-3">
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
