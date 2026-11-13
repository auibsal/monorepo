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
import { isNameLocked, isNameTaken } from "@/lib/diwan/errors";
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
  | { kind: "names"; languages: ("en" | "ar")[] }
  | { kind: "pledge"; pledge: PledgeKind };

export interface SetupPlan {
  steps: SetupStep[];
  /** First setup ends on the welcome screen; a renewal goes straight on. */
  welcome: boolean;
}

/**
 * What setup still asks (the third prompt, §1: sign-up in three screens at
 * most, the address and password being the first): the names not yet
 * given, both languages on one screen, then each pledge not yet made in
 * its current version. Everything else waits on Today or Settings (the
 * photo question is in Profile). Everything is saved as it's answered, so
 * a reload asks only what's left.
 */
const namesStep = (names: Names): SetupStep[] => {
  const languages = (["en", "ar"] as const).filter(
    (language) => !nameParts.partsComplete(names[language])
  );
  return languages.length > 0
    ? [{ kind: "names", languages: [...languages] }]
    : [];
};

export const planSetup = ({
  member = true,
  names,
  pending,
  setupDone,
}: {
  /** False for a partner's representative who is not a member: names only. */
  member?: boolean;
  names: Names;
  pending: readonly PledgeKind[];
  setupDone: boolean;
}): SetupPlan => ({
  steps: [
    ...namesStep(names),
    ...(member
      ? pending.map((pledge) => ({ kind: "pledge", pledge }) as const)
      : []),
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
  | { kind: "names"; languages: ("en" | "ar")[]; names: Names }
  | { kind: "pledge"; pledge: PledgeKind };

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
  // What was on record when setup opened: those parts are locked (the
  // database refuses to change them from the account), so they show as
  // read-only and are never sent again.
  const [saved, setSaved] = useState<Names>({
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
    setSaved(current);
    const { kind } = mine.data;
    const planned = planSetup({
      // Members and guests make the pledges; a partner's people, and
      // anyone with no membership yet, only give their names.
      member: kind === "member" || kind === "guest",
      names: current,
      pending: (status.data.pending_pledges ?? []) as PledgeKind[],
      setupDone: Boolean(profile.data.setup_completed_at),
    });
    setPlan(planned);
    // Nothing to ask (names given at sign-up, no pledge due): setup is done.
    if (planned.steps.length === 0 && !profile.data.setup_completed_at) {
      supabase
        .schema("core")
        .from("profiles")
        .update({ setup_completed_at: new Date().toISOString() })
        .eq("id", user?.id ?? "")
        .then(() => queryClient.invalidateQueries());
    }
    window.history.replaceState(null, "", stepUrl(0));
  }, [
    mine.data,
    plan,
    profile.data,
    queryClient,
    status.data,
    supabase,
    user?.id,
  ]);

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
      if (answer.kind === "names") {
        await update(
          Object.assign(
            {},
            ...answer.languages.map((language) =>
              nameParts.partsUpdate(
                answer.names[language],
                language,
                lockedParts(saved[language])
              )
            )
          )
        );
      } else {
        await membership.acceptPledge(
          supabase,
          answer.pledge,
          versions.data?.[answer.pledge] ?? "1"
        );
      }
      // The last answer finishes setup.
      if (
        plan &&
        index + 1 >= plan.steps.length &&
        !profile.data?.setup_completed_at
      ) {
        await update({ setup_completed_at: new Date().toISOString() });
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
  const failedText = (error: unknown) => {
    if (isNameTaken(error)) {
      return te("nameTaken");
    }
    return isNameLocked(error) ? te("nameLocked") : te("saveFailed");
  };
  const failed = save.isError ? (
    <p className="text-text" role="alert">
      {failedText(save.error)}
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
      {step.kind === "names" ? (
        <NameStep
          back={back}
          failed={failed}
          heading={heading}
          languages={step.languages}
          names={names}
          onChange={setNames}
          onSubmit={() =>
            save.mutate({ kind: "names", languages: step.languages, names })
          }
          pending={save.isPending}
          saved={saved}
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

/**
 * The name as on the person's papers, in English and its Arabic form on
 * one screen (each language's four parts); Enter moves on.
 */
const NameStep = ({
  back,
  failed,
  heading,
  languages,
  names,
  onChange,
  onSubmit,
  pending,
  saved,
}: StepProps & {
  languages: ("en" | "ar")[];
  names: Names;
  onChange: (names: Names) => void;
  onSubmit: () => void;
  saved: Names;
}) => {
  const t = useTranslations("diwan.setup");
  const id = useId();
  const ready = languages.every((language) =>
    nameParts.partsReady(names[language], language)
  );
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (ready && !pending) {
      onSubmit();
    }
  };
  return (
    <form className="grid gap-6" onSubmit={submit}>
      <div className="grid gap-2">
        <StepHeading heading={heading}>{t("names.title")}</StepHeading>
        <p className="type-body text-text-secondary" id={`${id}-hint`}>
          {t("name.hint")}
        </p>
      </div>
      {languages.map((language) => (
        <fieldset className="grid gap-3" key={language}>
          <legend className="type-subheading mb-2">
            {language === "en" ? t("nameEn.title") : t("nameAr.title")}
          </legend>
          <NamePartsFields
            describedBy={`${id}-hint`}
            language={language}
            locked={lockedParts(saved[language])}
            onChange={(parts) => onChange({ ...names, [language]: parts })}
            parts={names[language]}
          />
        </fieldset>
      ))}
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
/** The parts already on record: the account can't change them. */
const lockedParts = (parts: nameParts.NameParts) =>
  nameParts.nameParts.filter((part) => parts[part].trim() !== "");

export const NamePartsFields = ({
  describedBy,
  language,
  locked = [],
  onChange,
  parts,
}: {
  describedBy?: string;
  language: "en" | "ar";
  /** Parts shown read-only (on record; Membership corrects them). */
  locked?: readonly nameParts.NamePart[];
  onChange: (parts: nameParts.NameParts) => void;
  parts: nameParts.NameParts;
}) => {
  const t = useTranslations("diwan.setup.name");
  const id = useId();
  const anyLocked = locked.length > 0;
  const wrongScript = !nameParts.partsInScript(parts, language);
  return (
    <div className="grid max-w-xl gap-4 sm:grid-cols-2">
      {nameParts.nameParts.map((part) => (
        <div className="grid gap-2" key={part}>
          <Label htmlFor={`${id}-${part}`}>{t(`parts.${part}`)}</Label>
          <Input
            aria-describedby={
              [
                describedBy,
                wrongScript ? `${id}-script` : null,
                locked.includes(part) ? `${id}-locked` : null,
              ]
                .filter(Boolean)
                .join(" ") || undefined
            }
            aria-invalid={!nameParts.inScript(parts[part], language)}
            autoComplete={autoComplete(language, part)}
            className="read-only:text-text-secondary"
            dir={language === "en" ? "ltr" : "rtl"}
            id={`${id}-${part}`}
            lang={language}
            maxLength={60}
            onChange={(event) =>
              onChange({ ...parts, [part]: event.target.value })
            }
            readOnly={locked.includes(part)}
            required={nameParts.requiredParts.includes(part)}
            value={parts[part]}
          />
        </div>
      ))}
      {anyLocked ? (
        <p className="type-caption sm:col-span-2" id={`${id}-locked`}>
          {t("locked")}
        </p>
      ) : null}
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
