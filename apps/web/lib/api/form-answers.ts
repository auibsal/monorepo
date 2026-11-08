import "server-only";

import ar from "@repo/internationalization/messages/ar.json";
import en from "@repo/internationalization/messages/en.json";
import { forms } from "@repo/sal-data";

type Lang = "en" | "ar";
type Labels = Record<string, unknown>;

const defs = (lang: Lang) =>
  ((lang === "ar" ? ar : en).diwan.forms.defs ?? {}) as Record<string, Labels>;

const at = (tree: unknown, path: string[]): string => {
  let node = tree;
  for (const part of path) {
    if (!node || typeof node !== "object") {
      return "";
    }
    node = (node as Labels)[part];
  }
  return typeof node === "string" ? node : "";
};

/** One answer as text, or "" to leave it out. */
const answerText = (
  field: forms.FormField,
  raw: unknown,
  option: (field: string, value: string) => string,
  yes: string
) => {
  if (raw === undefined || raw === null || raw === "") {
    return "";
  }
  if (field.type === "check") {
    return raw === true ? yes : "";
  }
  if (field.type === "choice") {
    return option(field.key, String(raw));
  }
  if (field.type === "multi" && Array.isArray(raw)) {
    return raw.map((v) => option(field.key, String(v))).join(", ");
  }
  return typeof raw === "string" || typeof raw === "number" ? String(raw) : "";
};

/**
 * A signed form's answers as "label: value" lines for the signer's copy,
 * in the order the form asks them; tables and grids are left to the copy
 * on the site.
 */
export const formAnswers = (lang: Lang, formKey: string, data: unknown) => {
  if (!(forms.isFormKey(formKey) && data) || typeof data !== "object") {
    return [];
  }
  const labels = defs(lang)[formKey];
  const values = data as Record<string, unknown>;
  const option = (field: string, value: string) =>
    at(labels, ["options", field, value]) || value;
  const yes = lang === "ar" ? "نعم" : "Yes";
  return forms.forms[formKey].fields.flatMap((field) => {
    const value = answerText(field, values[field.key], option, yes);
    return value
      ? [{ label: at(labels, ["fields", field.key]) || field.key, value }]
      : [];
  });
};
