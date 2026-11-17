"use client";

import { createContext, useContext } from "react";

/**
 * The section a form is being edited in (decisions.md, The site: "One
 * record page"). Inside one, a form's Save moves to the section's sticky
 * bar (`SaveButton` renders there), and a finished save closes the form.
 */
export interface SectionForm {
  /** The sticky bar's slot, where the form's Save is drawn. */
  readonly bar: HTMLElement | null;
  /** Called once the form has saved: the section returns to reading. */
  readonly saved: () => void;
}

export const SectionFormContext = createContext<SectionForm | null>(null);

export const useSectionForm = () => useContext(SectionFormContext);
