/**
 * The retired names (decisions.md, Retired names): never in copy. One
 * list for the language check (scripts/check-language.ts) and the weekly
 * scan of Notion's documents (lib/api/notion/scan.ts).
 */
export const RETIRED_NAMES =
  /\b(the Salon|Book Circle|Open Pages|Listening Room|Launch Night|[Oo]pen nights?|[Ss]tation days?|Candidates’ Reading|the Ribbon|[Ww]orst-poem contest|Apprenticeships?|First Ink|[Tt]rial term|General Assembly|AGM|Qirtas Awards?|(Tabari|Jahiz|Nazik|Wasiti|Ibn al-Haytham) Award|Qirtas Prizes|[Cc]hapbook|Fellows?|Fellowship|Life Members?|Majlis|Munazara|Mutanabbi Friday|Bad Poetry Night|Open Stage|Scratch Night|Motion Night|Mutanabbi Walk|Productions|Gallery Wall|Month in Qirtas|Side Quest|BusTalks|Waraq|Nexus|Book of (Members|Fellows)|Charter (Night|Day)|Director of (the Company|Letters|Stage and Arts|Programs)|Editor of Qirtas|(Deputy )?Treasurer|Green Room|AUIB SAL HQ|Callboard|Program Leads?|Salon|[Ll]edgers?|[Rr]otas?|[Bb]ook votes?|[Pp]rompt cards?|[Ss]ix programs|Standing Programs?|[Ff]lagships?|the Evenings|the Specials|[Ww]eekly evenings?|[Ff]our-week cycle|[Ee]very fourth week|Arts and Sciences College|What[’']s on|General Secretary|Acting President|Submissions Manager|Event Coordinator|Venues and Logistics Lead|Production Lead|Event Staff|Arabic Editor|Onboarding Lead|Records and Recognition Lead|Technical Administrator|Founders[’'] Roll|Honorary Fellows?|[Pp]aperless pledge|Ubuntu Arabic|Issue 1|[Pp]ilot issue|printed year-in-review)\b/u;

/**
 * Terms the documents should no longer use (docs/platform/terms-to-check.md,
 * Nov 16, 2026): the old names of Qirtas's calls and the old credit lines.
 */
export const TERMS_TO_CHECK = [
  "general submissions",
  "themed call",
  "standing call",
  "Held with",
  "Supported by",
  "With the support of",
  "Write for Qirtas",
  "pilot issue",
] as const;
