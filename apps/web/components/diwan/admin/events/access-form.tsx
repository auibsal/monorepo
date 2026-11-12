"use client";

import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Label } from "@repo/brand/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";
import { ChoiceInput } from "../choice-input";
import { ErrorLine, SaveButton } from "../kit";

/** The fourteen allergens (events.events.allergens), in the law's order. */
const ALLERGENS = [
  "gluten",
  "crustaceans",
  "eggs",
  "fish",
  "peanuts",
  "soy",
  "milk",
  "tree_nuts",
  "celery",
  "mustard",
  "sesame",
  "sulphites",
  "lupin",
  "molluscs",
] as const;

type Allergen = (typeof ALLERGENS)[number];

interface AccessFields {
  allergens: string[];
  seating: string | null;
  serves_food: boolean;
  step_free: boolean | null;
}

const stepValue = (stepFree: boolean | null) => {
  if (stepFree === null) {
    return "";
  }
  return stepFree ? "yes" : "no";
};

/**
 * What the event page states about access (decisions.md, Events): the way
 * in and the room, the seating, and whether food is served with its main
 * allergens. Food also adds the diet question to the booking (the database
 * writes the questions).
 */
export const AccessForm = ({
  event,
  eventId,
  rsvp,
}: {
  readonly event: AccessFields;
  readonly eventId: string;
  /** The event takes bookings: say that food adds the diet question. */
  readonly rsvp: boolean;
}) => {
  const t = useTranslations("diwan.admin.event");
  const ta = useTranslations("web.events.access");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const id = useId();
  const [servesFood, setServesFood] = useState(event.serves_food);
  const [stepFree, setStepFree] = useState(stepValue(event.step_free));
  const [seating, setSeating] = useState(event.seating ?? "");
  const [allergens, setAllergens] = useState<string[]>(event.allergens);

  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("events")
          .from("events")
          .update({
            allergens: servesFood ? allergens : [],
            seating: seating || null,
            serves_food: servesFood,
            step_free: stepFree === "" ? null : stepFree === "yes",
          })
          .eq("id", eventId)
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin"] }),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };
  const toggle = (allergen: Allergen, on: boolean) =>
    setAllergens((list) =>
      on ? [...list, allergen] : list.filter((a) => a !== allergen)
    );

  return (
    <form className="grid max-w-4xl gap-4" onSubmit={submit}>
      <h2 className="type-subheading">{t("access")}</h2>
      <p className="type-caption">{t("accessHint")}</p>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-step`}>{t("stepFree")}</Label>
        <ChoiceInput
          id={`${id}-step`}
          onChange={(e) => setStepFree(e.target.value)}
          value={stepFree}
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
          onChange={(e) => setSeating(e.target.value)}
          value={seating}
        >
          <option value="">{t("notSaid")}</option>
          <option value="seated">{ta("seating.seated")}</option>
          <option value="standing">{ta("seating.standing")}</option>
          <option value="mixed">{ta("seating.mixed")}</option>
        </ChoiceInput>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={servesFood}
          id={`${id}-food`}
          onCheckedChange={(v) => setServesFood(v === true)}
        />
        <Label htmlFor={`${id}-food`}>{t("servesFood")}</Label>
      </div>
      {rsvp ? <p className="type-caption">{t("questionsHint")}</p> : null}
      {servesFood ? (
        <fieldset className="grid gap-2">
          <legend className="type-label mb-2">{t("allergens")}</legend>
          <ul className="grid gap-2 sm:grid-cols-2">
            {ALLERGENS.map((allergen) => (
              <li className="flex items-center gap-2" key={allergen}>
                <Checkbox
                  checked={allergens.includes(allergen)}
                  id={`${id}-${allergen}`}
                  onCheckedChange={(v) => toggle(allergen, v === true)}
                />
                <Label htmlFor={`${id}-${allergen}`}>
                  {ta(`allergens.${allergen}`)}
                </Label>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <SaveButton pending={save.isPending} success={save.isSuccess} />
      </div>
      {save.error ? <ErrorLine error={save.error} /> : null}
    </form>
  );
};
