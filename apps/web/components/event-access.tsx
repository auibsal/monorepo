import { project } from "@repo/config";
import type { Locale } from "@repo/internationalization";
import { getTranslations } from "next-intl/server";

/** The fourteen allergens an event's food can name (events.events.allergens). */
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

const isAllergen = (value: string): value is Allergen =>
  (ALLERGENS as readonly string[]).includes(value);

/**
 * Each event page states its access plainly (decisions.md, Events): the
 * way in and the room, the seating, and the food with its main allergens.
 * What the lead hasn't said yet is a line to ask.
 */
export const EventAccess = async ({
  event,
  locale,
}: {
  readonly event: {
    allergens: string[];
    seating: string | null;
    serves_food: boolean;
    step_free: boolean | null;
  };
  readonly locale: Locale;
}) => {
  const t = await getTranslations({ locale, namespace: "web.events.access" });
  const list = new Intl.ListFormat(locale === "ar" ? "ar" : "en-US", {
    type: "conjunction",
  });
  const allergens = event.allergens
    .filter(isAllergen)
    .map((a) => t(`allergens.${a}`));

  let stepFree = t("stepUnknown", { email: project.mailboxes.accessibility });
  if (event.step_free !== null) {
    stepFree = event.step_free ? t("stepFree") : t("notStepFree");
  }
  let food = t("noFood");
  if (event.serves_food) {
    food =
      allergens.length > 0
        ? t("foodWith", { allergens: list.format(allergens) })
        : t("foodWithout");
  }
  const seating =
    event.seating && ["seated", "standing", "mixed"].includes(event.seating)
      ? t(`seating.${event.seating as "seated" | "standing" | "mixed"}`)
      : null;

  return (
    <section
      aria-labelledby="event-access"
      className="border-line pt-space-4 grid gap-2 border-t"
    >
      <h2 className="type-heading" id="event-access">
        {t("title")}
      </h2>
      <ul className="type-body grid gap-1">
        <li>{stepFree}</li>
        {seating ? <li>{seating}</li> : null}
        <li>{food}</li>
      </ul>
    </section>
  );
};
