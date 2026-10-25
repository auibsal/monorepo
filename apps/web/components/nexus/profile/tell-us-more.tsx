"use client";

import { useAuth } from "@repo/auth/provider";
import { FormHeader } from "@repo/design-system/components/sal/form-header";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { cn } from "@repo/design-system/lib/utils";
import { Link, useRouter } from "@repo/internationalization/navigation";
import { membership } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { ErrorState, FullPageSpinner } from "../states";

type Details = membership.MemberDetails;

export type MoreStep =
  | "affiliation"
  | "study"
  | "interests"
  | "skills"
  | "languages"
  | "about"
  | "heard"
  | "consent";

/**
 * The questions of "Tell us more", one per screen (owner, 2026-10-25). Study
 * is asked only of AUIB students and graduates.
 */
export const moreSteps = (details: Details): MoreStep[] => [
  "affiliation",
  ...(details.affiliation === "student" || details.affiliation === "alumni"
    ? (["study"] as const)
    : []),
  "interests",
  "skills",
  "languages",
  "about",
  "heard",
  "consent",
];

/** Whether Today should offer the journey: nothing to match roles with yet. */
export const detailsThin = (details: Details) =>
  details.interests.length === 0 && details.skills.length === 0;

const toYear = (value: string) => {
  const year = Number.parseInt(value, 10);
  return Number.isFinite(year) ? year : null;
};

const toText = (value: string) => (value.trim() === "" ? null : value);

/** Tap to choose; a second tap takes it back. */
const Chips = <T extends string>({
  label,
  multiple,
  name,
  onChange,
  options,
  value,
}: {
  label: string;
  multiple: boolean;
  name: (option: T) => string;
  onChange: (value: T[]) => void;
  options: readonly T[];
  value: readonly T[];
}) => (
  <fieldset className="grid gap-3">
    <legend className="sr-only">{label}</legend>
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const chosen = value.includes(option);
        return (
          <button
            aria-pressed={chosen}
            className={cn(
              "min-h-11 border px-4 py-2 text-base transition-colors",
              chosen
                ? "border-text bg-text text-surface"
                : "border-line text-text hover:border-text"
            )}
            key={option}
            onClick={() => {
              if (multiple) {
                onChange(
                  chosen
                    ? value.filter((item) => item !== option)
                    : [...value, option]
                );
              } else {
                onChange(chosen ? [] : [option]);
              }
            }}
            type="button"
          >
            {name(option)}
          </button>
        );
      })}
    </div>
  </fieldset>
);

const stepUrl = (index: number) => {
  const params = new URLSearchParams(window.location.search);
  params.set("step", String(index + 1));
  return `${window.location.pathname}?${params.toString()}`;
};

/**
 * "Tell us more": the optional details, a question at a time, each with
 * Skip, saved as each is answered. The full form stays in Profile.
 */
export const TellUsMore = () => {
  const t = useTranslations("nexus.more");
  const td = useTranslations("nexus.details");
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const heading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const saved = useQuery({
    enabled: Boolean(user),
    queryFn: () => membership.myDetails(supabase, user?.id ?? ""),
    queryKey: ["member-details", user?.id],
  });
  const [value, setValue] = useState<Details | null>(null);
  const [kept, setKept] = useState<Details | null>(null);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (saved.data && !value) {
      setValue(saved.data);
      setKept(saved.data);
      window.history.replaceState(null, "", stepUrl(0));
    }
  }, [saved.data, value]);

  useEffect(() => {
    const onPop = () => {
      const step = Number(
        new URLSearchParams(window.location.search).get("step")
      );
      if (Number.isInteger(step) && step >= 1) {
        setDone(false);
        setIndex(step - 1);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the screen changes
  useEffect(() => {
    window.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, [index, done]);

  const steps = moreSteps(value ?? membership.emptyDetails);

  const advance = async () => {
    if (index + 1 < steps.length) {
      window.history.pushState(null, "", stepUrl(index + 1));
      setIndex(index + 1);
      return;
    }
    await queryClient.invalidateQueries({
      queryKey: ["member-details", user?.id],
    });
    setDone(true);
  };

  const save = useMutation({
    mutationFn: (next: Details) =>
      membership.saveDetails(supabase, user?.id ?? "", next),
    onSuccess: async (_data, next) => {
      setKept(next);
      await advance();
    },
  });

  if (saved.isError) {
    return <ErrorState onRetry={() => saved.refetch()} />;
  }
  if (!(value && kept)) {
    return <FullPageSpinner />;
  }

  if (done) {
    return <Done heading={heading} />;
  }

  const step = steps[Math.min(index, steps.length - 1)] ?? "affiliation";
  const set = <K extends keyof Details>(key: K, next: Details[K]) =>
    setValue({ ...value, [key]: next });
  // Skip leaves this question as it was saved.
  const skip = () => {
    save.reset();
    setValue(kept);
    advance();
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!save.isPending) {
      save.mutate(value);
    }
  };

  const questions: Record<MoreStep, { body?: string; field: ReactNode }> = {
    about: {
      field: (
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor={`${id}-birth`}>{td("birthYear")}</Label>
            <Input
              className="max-w-40"
              dir="ltr"
              id={`${id}-birth`}
              inputMode="numeric"
              max={2015}
              min={1930}
              onChange={(e) => set("birth_year", toYear(e.target.value))}
              type="number"
              value={value.birth_year ?? ""}
            />
          </div>
          <div className="grid gap-2">
            <p className="font-medium text-sm">{td("gender")}</p>
            <Chips
              label={td("gender")}
              multiple={false}
              name={(g) => td(`genders.${g}`)}
              onChange={(next) => set("gender", next[0] ?? null)}
              options={membership.genders}
              value={value.gender ? [value.gender] : []}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-city`}>{td("city")}</Label>
            <Input
              autoComplete="address-level2"
              className="max-w-sm"
              id={`${id}-city`}
              maxLength={80}
              onChange={(e) => set("city", toText(e.target.value))}
              value={value.city ?? ""}
            />
          </div>
        </div>
      ),
    },
    affiliation: {
      field: (
        <Chips
          label={td("affiliation")}
          multiple={false}
          name={(a) => td(`affiliations.${a}`)}
          onChange={(next) => set("affiliation", next[0] ?? null)}
          options={membership.affiliations}
          value={value.affiliation ? [value.affiliation] : []}
        />
      ),
    },
    consent: {
      body: td("consentHint"),
      field: (
        <Chips
          label={t("consent.title")}
          multiple={false}
          name={(option) => t(`consent.${option}`)}
          onChange={(next) => set("research_consent", next[0] === "yes")}
          options={["yes", "no"] as const}
          value={value.research_consent ? ["yes"] : ["no"]}
        />
      ),
    },
    heard: {
      field: (
        <Chips
          label={td("heardFrom")}
          multiple={false}
          name={(h) => td(`heard.${h}`)}
          onChange={(next) => set("heard_from", next[0] ?? null)}
          options={membership.heardFrom}
          value={value.heard_from ? [value.heard_from] : []}
        />
      ),
    },
    interests: {
      body: t("many"),
      field: (
        <Chips
          label={td("interestsLabel")}
          multiple
          name={(option) => td(`interests.${option}`)}
          onChange={(next) => set("interests", next)}
          options={membership.interests}
          value={value.interests}
        />
      ),
    },
    languages: {
      body: t("many"),
      field: (
        <Chips
          label={td("languagesLabel")}
          multiple
          name={(option) => td(`languages.${option}`)}
          onChange={(next) => set("languages", next)}
          options={membership.memberLanguages}
          value={value.languages}
        />
      ),
    },
    skills: {
      body: t("skills.body"),
      field: (
        <div className="grid gap-6">
          <Chips
            label={td("skillsLabel")}
            multiple
            name={(option) => td(`skills.${option}`)}
            onChange={(next) => set("skills", next)}
            options={membership.skills}
            value={value.skills}
          />
          <Chips
            label={td("volunteer")}
            multiple={false}
            name={() => td("volunteer")}
            onChange={(next) => set("volunteer", next.length > 0)}
            options={["volunteer"] as const}
            value={value.volunteer ? ["volunteer"] : []}
          />
        </div>
      ),
    },
    study: {
      field: (
        <div className="grid gap-6">
          <div className="grid gap-2">
            <p className="font-medium text-sm">{td("studyLevel")}</p>
            <Chips
              label={td("studyLevel")}
              multiple={false}
              name={(level) => td(`studyLevels.${level}`)}
              onChange={(next) => set("study_level", next[0] ?? null)}
              options={membership.studyLevels}
              value={value.study_level ? [value.study_level] : []}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={`${id}-college`}>{td("college")}</Label>
              <Input
                id={`${id}-college`}
                maxLength={120}
                onChange={(e) => set("college", toText(e.target.value))}
                value={value.college ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${id}-major`}>{td("major")}</Label>
              <Input
                id={`${id}-major`}
                maxLength={120}
                onChange={(e) => set("major", toText(e.target.value))}
                value={value.major ?? ""}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-graduation`}>{td("graduationYear")}</Label>
            <Input
              className="max-w-40"
              dir="ltr"
              id={`${id}-graduation`}
              inputMode="numeric"
              max={2100}
              min={1990}
              onChange={(e) => set("graduation_year", toYear(e.target.value))}
              type="number"
              value={value.graduation_year ?? ""}
            />
          </div>
        </div>
      ),
    },
  };
  const question = questions[step];

  return (
    <div className="grid max-w-2xl gap-8">
      <FormHeader title={t("title")}>
        {t("stepOf", {
          count: String(steps.length),
          step: String(index + 1),
        })}
      </FormHeader>
      <div aria-hidden="true" className="-mt-4 h-1 w-full bg-line">
        <div
          className="h-full bg-band transition-[width]"
          style={{ width: `${((index + 1) / steps.length) * 100}%` }}
        />
      </div>
      <form className="grid gap-6" onSubmit={submit}>
        <div className="grid gap-2">
          <h2
            className="type-title font-light outline-none"
            ref={heading}
            tabIndex={-1}
          >
            {t(`${step}.title`)}
          </h2>
          {question.body ? (
            <p className="type-body text-text-secondary">{question.body}</p>
          ) : null}
        </div>
        {question.field}
        <Actions
          back={index > 0}
          failed={save.isError}
          last={index + 1 >= steps.length}
          onSkip={skip}
          pending={save.isPending}
        />
      </form>
    </div>
  );
};

/** Continue (or Finish), Skip and Back. */
const Actions = ({
  back,
  failed,
  last,
  onSkip,
  pending,
}: {
  back: boolean;
  failed: boolean;
  last: boolean;
  onSkip: () => void;
  pending: boolean;
}) => {
  const t = useTranslations("nexus.more");
  const te = useTranslations("nexus.errors");
  return (
    <>
      {failed ? (
        <p className="text-text" role="alert">
          {te("saveFailed")}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button disabled={pending} type="submit">
          {last ? t("finish") : t("continue")}
        </Button>
        <Button
          className="px-0"
          disabled={pending}
          onClick={onSkip}
          type="button"
          variant="link"
        >
          {t("skip")}
        </Button>
        {back ? (
          <Button
            className="px-0"
            onClick={() => window.history.back()}
            type="button"
            variant="link"
          >
            {t("back")}
          </Button>
        ) : null}
      </div>
    </>
  );
};

/** The last screen: thanks, and the way back. */
const Done = ({
  heading,
}: {
  heading: RefObject<HTMLHeadingElement | null>;
}) => {
  const t = useTranslations("nexus.more");
  const router = useRouter();
  return (
    <div className="grid max-w-2xl gap-8">
      <h1
        className="type-display font-light outline-none"
        ref={heading}
        tabIndex={-1}
      >
        {t("done.title")}
      </h1>
      <p className="type-body">{t("done.body")}</p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button onClick={() => router.push("/membership")} type="button">
          {t("done.open")}
        </Button>
        <Link className="link" href="/membership/profile">
          {t("done.profile")}
        </Link>
      </div>
    </div>
  );
};

/** The line on Today that offers the journey while there's little to match. */
export const TellUsMoreLine = () => {
  const t = useTranslations("nexus.more");
  const { supabase, user } = useAuth();
  const details = useQuery({
    enabled: Boolean(user),
    queryFn: () => membership.myDetails(supabase, user?.id ?? ""),
    queryKey: ["member-details", user?.id],
  });
  if (!(details.data && detailsThin(details.data))) {
    return null;
  }
  return (
    <p className="type-body border-line border-y py-space-3">
      <Link className="link font-medium" href="/membership/more">
        {t("today.link")}
      </Link>{" "}
      <span className="text-text-secondary">{t("today.line")}</span>
    </p>
  );
};
