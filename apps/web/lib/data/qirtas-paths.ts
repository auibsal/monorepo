/**
 * Qirtas's addresses (decisions.md, Qirtas), kept apart from the data code
 * so the public pages' own code stays small.
 */

/**
 * "Send your work" (decisions.md, Qirtas): the open Edition's page, at
 * its call. The address finds whichever Edition's call is open
 * (app/[locale]/(site)/qirtas/editions/open), so links never go stale.
 */
export const SEND_YOUR_WORK = "/qirtas/editions/open";

/** Voices' two forms, at /qirtas/voices/letter and /qirtas/voices/op-ed. */
export const voicesForms = {
  letter: "letter_to_editor",
  "op-ed": "opinion_essay",
} as const;
type VoicesForm = keyof typeof voicesForms;
export const isVoicesForm = (value: string): value is VoicesForm =>
  Object.hasOwn(voicesForms, value);

/**
 * A form's address: Voices' letters and op-eds at their own door, Edition
 * work under the Edition (the open Edition's when it isn't known).
 */
export const draftPath = (category: string, edition = "open") => {
  const voices = Object.entries(voicesForms).find(([, c]) => c === category);
  return voices
    ? `/qirtas/voices/${voices[0]}`
    : `/qirtas/editions/${edition}/submit/${category}`;
};
