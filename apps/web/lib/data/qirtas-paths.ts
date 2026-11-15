/**
 * Qirtas's addresses (decisions.md, Qirtas), kept apart from the data code
 * so the public pages' own code stays small.
 */

/** "Send your work": Editions filtered to its open calls, the one door. */
export const SEND_YOUR_WORK = "/qirtas/editions?status=open";

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
 * work under the Edition (the general submissions' when it isn't known).
 */
export const draftPath = (category: string, edition = "edition-1") => {
  const voices = Object.entries(voicesForms).find(([, c]) => c === category);
  return voices
    ? `/qirtas/voices/${voices[0]}`
    : `/qirtas/editions/${edition}/submit/${category}`;
};
