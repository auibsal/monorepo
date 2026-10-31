"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { membership } from "@repo/sal-data";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useId, useState } from "react";
import { Field, SelectInput } from "../admin/kit";
import { DiwanSection } from "../page";

type Details = membership.MemberDetails;

interface DetailsFieldsProps {
  readonly onChange: (value: Details) => void;
  readonly value: Details;
}

const toYear = (value: string) => {
  const year = Number.parseInt(value, 10);
  return Number.isFinite(year) ? year : null;
};

const toText = (value: string) => (value.trim() === "" ? null : value);

/** A set of checkboxes for one list (languages, interests, skills). */
const Choices = <T extends string>({
  label,
  name,
  onChange,
  options,
  value,
}: {
  label: string;
  name: (option: T) => string;
  onChange: (value: T[]) => void;
  options: readonly T[];
  value: readonly T[];
}) => {
  const id = useId();
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-2 font-medium text-sm">{label}</legend>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        {options.map((option) => (
          <div className="flex items-center gap-2" key={option}>
            <Checkbox
              checked={value.includes(option)}
              id={`${id}-${option}`}
              onCheckedChange={(checked) =>
                onChange(
                  checked === true
                    ? [...value, option]
                    : value.filter((item) => item !== option)
                )
              }
            />
            <Label className="font-normal" htmlFor={`${id}-${option}`}>
              {name(option)}
            </Label>
          </div>
        ))}
      </div>
    </fieldset>
  );
};

/**
 * What a member may tell the Society about themselves. Every answer is
 * optional; the last choice says whether the answers may be counted in
 * anonymous reports. Only the member and the Membership officers read them.
 */
export const DetailsFields = ({ onChange, value }: DetailsFieldsProps) => {
  const t = useTranslations("nexus.details");
  const id = useId();
  const set = <K extends keyof Details>(key: K, next: Details[K]) =>
    onChange({ ...value, [key]: next });
  const atAuib = value.affiliation !== "community";

  return (
    <div className="grid gap-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("affiliation")}>
          {(fieldId) => (
            <SelectInput
              id={fieldId}
              onChange={(e) =>
                set(
                  "affiliation",
                  (toText(e.target.value) as Details["affiliation"]) ?? null
                )
              }
              value={value.affiliation ?? ""}
            >
              <option value="">{t("choose")}</option>
              {membership.affiliations.map((a) => (
                <option key={a} value={a}>
                  {t(`affiliations.${a}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        {atAuib ? (
          <Field hint={t("studentIdHint")} label={t("studentId")}>
            {(fieldId) => (
              <Input
                dir="ltr"
                id={fieldId}
                inputMode="numeric"
                maxLength={20}
                onChange={(e) => set("student_id", toText(e.target.value))}
                value={value.student_id ?? ""}
              />
            )}
          </Field>
        ) : null}
        {atAuib ? (
          <Field label={t("college")}>
            {(fieldId) => (
              <Input
                id={fieldId}
                maxLength={120}
                onChange={(e) => set("college", toText(e.target.value))}
                value={value.college ?? ""}
              />
            )}
          </Field>
        ) : null}
        {atAuib ? (
          <Field label={t("major")}>
            {(fieldId) => (
              <Input
                id={fieldId}
                maxLength={120}
                onChange={(e) => set("major", toText(e.target.value))}
                value={value.major ?? ""}
              />
            )}
          </Field>
        ) : null}
        {atAuib ? (
          <Field label={t("studyLevel")}>
            {(fieldId) => (
              <SelectInput
                id={fieldId}
                onChange={(e) =>
                  set(
                    "study_level",
                    (toText(e.target.value) as Details["study_level"]) ?? null
                  )
                }
                value={value.study_level ?? ""}
              >
                <option value="">{t("choose")}</option>
                {membership.studyLevels.map((level) => (
                  <option key={level} value={level}>
                    {t(`studyLevels.${level}`)}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
        ) : null}
        {atAuib ? (
          <Field label={t("graduationYear")}>
            {(fieldId) => (
              <Input
                dir="ltr"
                id={fieldId}
                inputMode="numeric"
                max={2100}
                min={1990}
                onChange={(e) => set("graduation_year", toYear(e.target.value))}
                type="number"
                value={value.graduation_year ?? ""}
              />
            )}
          </Field>
        ) : null}
        <Field label={t("birthYear")}>
          {(fieldId) => (
            <Input
              dir="ltr"
              id={fieldId}
              inputMode="numeric"
              max={2015}
              min={1930}
              onChange={(e) => set("birth_year", toYear(e.target.value))}
              type="number"
              value={value.birth_year ?? ""}
            />
          )}
        </Field>
        <Field label={t("gender")}>
          {(fieldId) => (
            <SelectInput
              id={fieldId}
              onChange={(e) =>
                set(
                  "gender",
                  (toText(e.target.value) as Details["gender"]) ?? null
                )
              }
              value={value.gender ?? ""}
            >
              <option value="">{t("choose")}</option>
              {membership.genders.map((g) => (
                <option key={g} value={g}>
                  {t(`genders.${g}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label={t("city")}>
          {(fieldId) => (
            <Input
              autoComplete="address-level2"
              id={fieldId}
              maxLength={80}
              onChange={(e) => set("city", toText(e.target.value))}
              value={value.city ?? ""}
            />
          )}
        </Field>
      </div>

      <Choices
        label={t("languagesLabel")}
        name={(option) => t(`languages.${option}`)}
        onChange={(next) => set("languages", next)}
        options={membership.memberLanguages}
        value={value.languages}
      />
      <Choices
        label={t("interestsLabel")}
        name={(option) => t(`interests.${option}`)}
        onChange={(next) => set("interests", next)}
        options={membership.interests}
        value={value.interests}
      />
      <Choices
        label={t("skillsLabel")}
        name={(option) => t(`skills.${option}`)}
        onChange={(next) => set("skills", next)}
        options={membership.skills}
        value={value.skills}
      />

      <div className="grid gap-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={value.volunteer}
            id={`${id}-volunteer`}
            onCheckedChange={(checked) => set("volunteer", checked === true)}
          />
          <Label className="leading-normal" htmlFor={`${id}-volunteer`}>
            {t("volunteer")}
          </Label>
        </div>
        <Field className="max-w-sm" label={t("heardFrom")}>
          {(fieldId) => (
            <SelectInput
              id={fieldId}
              onChange={(e) =>
                set(
                  "heard_from",
                  (toText(e.target.value) as Details["heard_from"]) ?? null
                )
              }
              value={value.heard_from ?? ""}
            >
              <option value="">{t("choose")}</option>
              {membership.heardFrom.map((h) => (
                <option key={h} value={h}>
                  {t(`heard.${h}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <div className="flex items-start gap-3">
          <Checkbox
            aria-describedby={`${id}-photos-hint`}
            checked={value.photo_consent}
            id={`${id}-photos`}
            onCheckedChange={(checked) =>
              set("photo_consent", checked === true)
            }
          />
          <div className="grid gap-1">
            <Label className="leading-normal" htmlFor={`${id}-photos`}>
              {t("photos")}
            </Label>
            <p className="type-caption" id={`${id}-photos-hint`}>
              {t("photosHint")}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Checkbox
            aria-describedby={`${id}-consent-hint`}
            checked={value.research_consent}
            id={`${id}-consent`}
            onCheckedChange={(checked) =>
              set("research_consent", checked === true)
            }
          />
          <div className="grid gap-1">
            <Label className="leading-normal" htmlFor={`${id}-consent`}>
              {t("consent")}
            </Label>
            <p className="type-caption" id={`${id}-consent-hint`}>
              {t("consentHint")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/** The Profile section: the same answers, saved on their own. */
export const DetailsSection = () => {
  const t = useTranslations("nexus.details");
  const te = useTranslations("nexus.errors");
  const { supabase, user } = useAuth();
  const [value, setValue] = useState(membership.emptyDetails);
  const saved = useQuery({
    enabled: Boolean(user),
    queryFn: () => membership.myDetails(supabase, user?.id ?? ""),
    queryKey: ["member-details", user?.id],
  });
  useEffect(() => {
    if (saved.data) {
      setValue(saved.data);
    }
  }, [saved.data]);
  const save = useMutation({
    mutationFn: () => membership.saveDetails(supabase, user?.id ?? "", value),
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save.mutate();
  };
  return (
    <DiwanSection description={t("lede")} id="details" title={t("title")}>
      <form className="grid gap-6" onSubmit={submit}>
        <DetailsFields
          onChange={(next) => {
            save.reset();
            setValue(next);
          }}
          value={value}
        />
        {save.isError ? (
          <p className="text-text" role="alert">
            {te("saveFailed")}
          </p>
        ) : null}
        <div className="flex items-center gap-4">
          <Button disabled={save.isPending} type="submit" variant="outline">
            {t("save")}
          </Button>
          {save.isSuccess ? (
            <p className="type-caption" role="status">
              {t("saved")}
            </p>
          ) : null}
        </div>
      </form>
    </DiwanSection>
  );
};
