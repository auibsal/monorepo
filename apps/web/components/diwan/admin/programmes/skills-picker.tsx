"use client";

import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Label } from "@repo/brand/components/ui/label";
import { membership } from "@repo/sal-data";
import { useTranslations } from "next-intl";
import { useId } from "react";

export type Skill = (typeof membership.skills)[number];

/** The skills a role or shift wants, from the same list as Profile. */
export const SkillsPicker = ({
  onChange,
  value,
}: {
  onChange: (skills: Skill[]) => void;
  value: readonly string[];
}) => {
  const t = useTranslations("diwan.admin.programmes.openings");
  const ts = useTranslations("diwan.details.skills");
  const id = useId();
  return (
    <fieldset className="grid gap-2">
      <legend className="font-medium text-sm">{t("skills")}</legend>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {membership.skills.map((skill) => (
          <div className="flex items-center gap-2" key={skill}>
            <Checkbox
              checked={value.includes(skill)}
              id={`${id}-${skill}`}
              onCheckedChange={(on) =>
                onChange(
                  (on === true
                    ? [...value, skill]
                    : value.filter((s) => s !== skill)) as Skill[]
                )
              }
            />
            <Label htmlFor={`${id}-${skill}`}>{ts(skill)}</Label>
          </div>
        ))}
      </div>
    </fieldset>
  );
};
