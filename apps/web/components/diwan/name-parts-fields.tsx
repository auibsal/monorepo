"use client";

import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { names as nameParts } from "@/lib/data";

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
 * The parts of the official name in one language (decisions.md, Members):
 * the given, father's, grandfather's and family names as on the person's
 * papers, or the given and family names where the papers don't use four;
 * each in its language's letters (the database checks the same).
 */
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
            required={part === "first"}
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
