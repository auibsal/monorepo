"use client";

import { Field } from "@repo/brand/components/sal/field";
import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { events, unwrap } from "@/lib/data";
import { ChoiceInput } from "../choice-input";
import { BilingualField, ErrorLine, SaveButton } from "../kit";

interface GoodToKnowFields {
  access_detail_ar: string | null;
  access_detail_en: string | null;
  accommodation_by: string | null;
  allergens: string[];
  content_note_ar: string | null;
  content_note_en: string | null;
  language: string | null;
  no_photos: boolean;
  other_allergens_ar: string | null;
  other_allergens_en: string | null;
  seating: string | null;
  served_ar: string | null;
  served_en: string | null;
  serves_food: boolean;
  step_free: boolean | null;
}

const stepValue = (stepFree: boolean | null) => {
  if (stepFree === null) {
    return "";
  }
  return stepFree ? "yes" : "no";
};

const pair = (en: string | null, ar: string | null) => ({
  ar: ar ?? "",
  en: en ?? "",
});

/** The form's state, from the event's fields. */
const initial = (event: GoodToKnowFields) => ({
  accessDetail: pair(event.access_detail_en, event.access_detail_ar),
  accommodationBy: event.accommodation_by ?? "",
  allergens: event.allergens,
  contentNote: pair(event.content_note_en, event.content_note_ar),
  language: event.language ?? "",
  noPhotos: event.no_photos,
  otherAllergens: pair(event.other_allergens_en, event.other_allergens_ar),
  seating: event.seating ?? "",
  served: pair(event.served_en, event.served_ar),
  servesFood: event.serves_food,
  stepFree: stepValue(event.step_free),
});

type FormState = ReturnType<typeof initial>;

/** The row the form writes (empty fields are null). */
const toRow = (f: FormState) => {
  const food = f.servesFood;
  return {
    access_detail_ar: f.accessDetail.ar || null,
    access_detail_en: f.accessDetail.en || null,
    accommodation_by: f.accommodationBy || null,
    allergens: food ? f.allergens : [],
    content_note_ar: f.contentNote.ar || null,
    content_note_en: f.contentNote.en || null,
    language: f.language || null,
    no_photos: f.noPhotos,
    other_allergens_ar: (food && f.otherAllergens.ar) || null,
    other_allergens_en: (food && f.otherAllergens.en) || null,
    seating: f.seating || null,
    served_ar: (food && f.served.ar) || null,
    served_en: (food && f.served.en) || null,
    serves_food: food,
    step_free: f.stepFree === "" ? null : f.stepFree === "yes",
  };
};

/** Food and drink: what is served and its allergens (the nine, then others). */
const FoodFields = ({
  form,
  setForm,
}: {
  readonly form: FormState;
  readonly setForm: (update: (f: FormState) => FormState) => void;
}) => {
  const t = useTranslations("diwan.admin.event");
  const tg = useTranslations("web.events.goodToKnow");
  const id = useId();
  const toggle = (allergen: events.Allergen, on: boolean) =>
    setForm((f) => ({
      ...f,
      allergens: on
        ? [...f.allergens, allergen]
        : f.allergens.filter((a) => a !== allergen),
    }));
  return (
    <>
      <BilingualField
        label={t("served")}
        maxLength={200}
        onChange={(served) => setForm((f) => ({ ...f, served }))}
        value={form.served}
      />
      <fieldset className="grid gap-2">
        <legend className="type-label mb-2">{t("allergens")}</legend>
        <ul className="grid gap-2 sm:grid-cols-3">
          {events.ALLERGENS.map((allergen) => (
            <li className="flex items-center gap-2" key={allergen}>
              <Checkbox
                checked={form.allergens.includes(allergen)}
                id={`${id}-${allergen}`}
                onCheckedChange={(v) => toggle(allergen, v === true)}
              />
              <Label htmlFor={`${id}-${allergen}`}>
                {tg(`allergens.${allergen}`)}
              </Label>
            </li>
          ))}
        </ul>
      </fieldset>
      <BilingualField
        label={t("otherAllergens")}
        maxLength={120}
        onChange={(otherAllergens) =>
          setForm((f) => ({ ...f, otherAllergens }))
        }
        value={form.otherAllergens}
      />
    </>
  );
};

/**
 * "Good to know" (decisions.md, Events): the site's own fields, shown on
 * the event's page under the date and place, one row per filled field:
 * the language, the access and the seating with the day to ask for an
 * accommodation by, the food and drink with its allergens, a content note,
 * and whether photos are taken. Food also adds the diet question to the
 * booking (the database writes the questions).
 */
export const AccessForm = ({
  event,
  eventId,
  rsvp,
}: {
  readonly event: GoodToKnowFields;
  readonly eventId: string;
  /** The event takes bookings: say that food adds the diet question. */
  readonly rsvp: boolean;
}) => {
  const t = useTranslations("diwan.admin.event");
  const tg = useTranslations("web.events.goodToKnow");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const id = useId();
  const [form, setForm] = useState(() => initial(event));

  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("api")
          .from("events")
          .update(toRow(form))
          .eq("id", eventId)
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin"] }),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };

  return (
    <form className="grid max-w-4xl gap-4" onSubmit={submit}>
      <h2 className="type-subheading">{t("access")}</h2>
      <p className="type-caption">{t("accessHint")}</p>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-language`}>{t("language")}</Label>
        <ChoiceInput
          id={`${id}-language`}
          onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
          value={form.language}
        >
          <option value="">{t("notSaid")}</option>
          <option value="en">{tg("language.en")}</option>
          <option value="ar">{tg("language.ar")}</option>
          <option value="both">{t("langBoth")}</option>
        </ChoiceInput>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-step`}>{t("stepFree")}</Label>
        <ChoiceInput
          id={`${id}-step`}
          onChange={(e) => setForm((f) => ({ ...f, stepFree: e.target.value }))}
          value={form.stepFree}
        >
          <option value="">{t("notSaid")}</option>
          <option value="yes">{t("yes")}</option>
          <option value="no">{t("no")}</option>
        </ChoiceInput>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-seating`}>{t("seating")}</Label>
        <ChoiceInput
          id={`${id}-seating`}
          onChange={(e) => setForm((f) => ({ ...f, seating: e.target.value }))}
          value={form.seating}
        >
          <option value="">{t("notSaid")}</option>
          <option value="seated">{tg("access.seating.seated")}</option>
          <option value="standing">{tg("access.seating.standing")}</option>
          <option value="mixed">{tg("access.seating.mixed")}</option>
        </ChoiceInput>
      </div>
      <BilingualField
        label={t("accessDetail")}
        maxLength={200}
        onChange={(accessDetail) => setForm((f) => ({ ...f, accessDetail }))}
        value={form.accessDetail}
      />
      <p className="type-caption">{t("accessDetailHint")}</p>
      <Field label={t("accommodationBy")}>
        {(fieldId) => (
          <Input
            className="max-w-48"
            dir="ltr"
            id={fieldId}
            onChange={(e) =>
              setForm((f) => ({ ...f, accommodationBy: e.target.value }))
            }
            type="date"
            value={form.accommodationBy}
          />
        )}
      </Field>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={form.servesFood}
          id={`${id}-food`}
          onCheckedChange={(v) =>
            setForm((f) => ({ ...f, servesFood: v === true }))
          }
        />
        <Label htmlFor={`${id}-food`}>{t("servesFood")}</Label>
      </div>
      {rsvp ? <p className="type-caption">{t("questionsHint")}</p> : null}
      {form.servesFood ? <FoodFields form={form} setForm={setForm} /> : null}
      <BilingualField
        label={t("contentNote")}
        maxLength={300}
        multiline
        onChange={(contentNote) => setForm((f) => ({ ...f, contentNote }))}
        rows={2}
        value={form.contentNote}
      />
      <div className="flex items-center gap-2">
        <Checkbox
          checked={form.noPhotos}
          id={`${id}-photos`}
          onCheckedChange={(v) =>
            setForm((f) => ({ ...f, noPhotos: v === true }))
          }
        />
        <Label htmlFor={`${id}-photos`}>{t("noPhotos")}</Label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SaveButton pending={save.isPending} success={save.isSuccess} />
      </div>
      {save.error ? <ErrorLine error={save.error} /> : null}
    </form>
  );
};
