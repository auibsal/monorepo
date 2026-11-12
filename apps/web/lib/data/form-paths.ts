/**
 * Where each form lives (decisions.md, Documents and forms): a step in its
 * own flow, never a number. The old /forms/<number> addresses redirect.
 */
export const formPaths = {
  f06: "/account/settings/disclosures/declare",
  f10: "/account/elections/motion",
  f11: "/get-involved/propose-an-event",
  f15: "/consent/media-release",
  f17: "/partners/dashboard/memorandum/sign",
  f21: "/about/contact/concern",
  f26: "/company/agreement",
  f37: "/get-involved/qalam-mentor-agreement",
  f38: "/consent/qalam",
  f39: "/consent/qalam-publishing",
  f45: "/consent/trip",
  f46: "/consent/parent",
} as const;

/**
 * The old numbered addresses (/forms/21, /forms/F-21, /forms/f21), shared in
 * emails and links, each with its form's new place: a permanent redirect.
 */
export const formRedirects = Object.entries(formPaths).flatMap(
  ([key, path]) => {
    const n = key.slice(1);
    return [n, String(Number(n)), `F-${n}`, `f-${n}`, key].map(
      (number) => [`/forms/${number}`, path] as const
    );
  }
);
