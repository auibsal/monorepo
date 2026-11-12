/**
 * Where each agreement and consent is signed (decisions.md, Documents and
 * forms): a step in its own flow, by its name, never a number. The old
 * /forms addresses redirect.
 */
export const formPaths = {
  "company-agreement": "/company/agreement",
  concern: "/about/contact/concern",
  "conflict-of-interest-declaration": "/account/settings/disclosures/declare",
  "event-pitch": "/get-involved/propose-an-event",
  "media-release": "/consent/media-release",
  "members-meeting-motion": "/account/elections/motion",
  "parent-consent": "/consent/parent",
  "partnership-memorandum": "/partners/dashboard/memorandum/sign",
  "qalam-mentor-agreement": "/get-involved/qalam-mentor-agreement",
  "qalam-parent-consent": "/consent/qalam",
  "qalam-publishing-consent": "/consent/qalam-publishing",
  "trip-consent": "/consent/trip",
} as const;

/**
 * The retired F-numbers (decisions.md, Documents and forms: "Names, not
 * numbers"): the one-time mapping from each old number to its kind's name,
 * so anything signed or shared under a number still resolves. The numbers
 * F-08, F-22, F-31 and F-44 were retired before and have no kind.
 */
export const legacyNumbers: Readonly<Record<string, string>> = {
  "F-01": "role-application",
  "F-02": "interview-score-sheet",
  "F-03": "appointment-letter",
  "F-04": "role-holder-checklist",
  "F-05": "service-letter",
  "F-06": "conflict-of-interest-declaration",
  "F-07": "handover",
  "F-09": "council-minutes",
  "F-10": "members-meeting-motion",
  "F-11": "event-pitch",
  "F-12": "event-plan",
  "F-13": "event-debrief",
  "F-14": "semester-report",
  "F-15": "media-release",
  "F-16": "incident-report",
  "F-17": "partnership-memorandum",
  "F-18": "needs-list",
  "F-19": "student-life-request",
  "F-20": "charity-collection-count",
  "F-21": "concern",
  "F-23": "tour-tally",
  "F-24": "audition-form",
  "F-25": "audition-score-sheet",
  "F-26": "company-agreement",
  "F-27": "stage-risk-checklist",
  "F-28": "rights-request-letter",
  "F-29": "faculty-advisor-invitation",
  "F-30": "thank-you-letter",
  "F-32": "application-outcome",
  "F-33": "welcome-letter",
  "F-34": "honorary-membership-invitation",
  "F-35": "members-meeting-notice",
  "F-36": "election-notice",
  "F-37": "qalam-mentor-agreement",
  "F-38": "qalam-parent-consent",
  "F-39": "qalam-publishing-consent",
  "F-40": "confidentiality-agreement",
  "F-41": "reader-score-sheet",
  "F-42": "author-letters",
  "F-43": "publication-agreement",
  "F-45": "trip-consent",
  "F-46": "parent-consent",
};

const LEGACY = /^(?:f-?)?(\d{1,2})$/iu;

/** "F-06", "f06", "6" → "conflict-of-interest-declaration", or null. */
export const nameFromLegacyNumber = (number: string) => {
  const digits = LEGACY.exec(number.trim())?.[1];
  return digits
    ? (legacyNumbers[`F-${digits.padStart(2, "0")}`] ?? null)
    : null;
};

/**
 * Every shared /forms address (/forms/21, /forms/F-21, /forms/f21,
 * /forms/f-21) and the named one (/forms/concern), each with its new home:
 * a permanent redirect. /forms itself goes to Documents, where each signed
 * copy is kept.
 */
export const formRedirects = [
  ["/forms", "/account/record"] as const,
  ...Object.entries(legacyNumbers).flatMap(([number, name]) => {
    const path = (formPaths as Record<string, string>)[name];
    if (!path) {
      return [];
    }
    const n = number.slice(2);
    return [n, String(Number(n)), `F-${n}`, `f-${n}`, `f${n}`, name].map(
      (address) => [`/forms/${address}`, path] as const
    );
  }),
];
