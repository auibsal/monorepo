// The /api/v1 endpoints, described once: GET /api/v1 lists them and the
// reference page (auibsal.org/developers/reference) shows them.

export interface Endpoint {
  /** What a body or query carries, when it carries anything. */
  readonly accepts?: string;
  readonly method: "GET" | "POST";
  readonly path: string;
  readonly summary: string;
  readonly who: string;
}

export const endpoints: readonly Endpoint[] = [
  {
    method: "GET",
    path: "/api/v1",
    summary: "This list, and the sign-in endpoints.",
    who: "Anyone",
  },
  {
    method: "GET",
    path: "/api/v1/me",
    summary:
      "The member's id, email, name and language (with the profile area), and their permissions.",
    who: "Member",
  },
  {
    method: "GET",
    path: "/api/v1/journal/calls",
    summary: "Waraq's calls open now, and the ones announced.",
    who: "Anyone",
  },
  {
    method: "GET",
    path: "/api/v1/journal/issues",
    summary: "Published editions.",
    who: "Anyone",
  },
  {
    method: "GET",
    path: "/api/v1/journal/submissions",
    summary: "The member's own submissions and where each one stands.",
    who: "Member",
  },
  {
    accepts:
      "call_id, category, language, title, body_html, human_authorship_confirmed: true; translations also source_text, source_author, rights_note",
    method: "POST",
    path: "/api/v1/journal/submissions",
    summary: "Submit a text piece to an open call.",
    who: "Member",
  },
  {
    accepts: "to, and an optional note",
    method: "POST",
    path: "/api/v1/journal/submissions/{id}/transition",
    summary: "Move a submission: withdraw it, or an editor's intake moves.",
    who: "Member or editor",
  },
  {
    method: "GET",
    path: "/api/v1/journal/reviews",
    summary:
      "Entries assigned to the member to read, blind, with their scores so far.",
    who: "Reader",
  },
  {
    accepts: "craft, voice, depth, archive_factor (1–5), comment",
    method: "POST",
    path: "/api/v1/journal/reviews/{assignment}/score",
    summary: "Score an entry on the rubric.",
    who: "Reader",
  },
  {
    accepts: "issue (query)",
    method: "GET",
    path: "/api/v1/journal/entries",
    summary:
      "Blind entries the member may see, with their reads, scores and decisions.",
    who: "Editor, Advisory Board",
  },
  {
    accepts: "accept, accept_with_edits or decline, with notes",
    method: "POST",
    path: "/api/v1/journal/entries/{id}/decision",
    summary:
      "An editorial decision. The author is told by email and notification.",
    who: "Editor (journal.decide)",
  },
];

/** Feeds anyone can subscribe to; no sign-in. */
export const feeds = [
  {
    path: "/api/calendar/sal.ics?lang=en",
    summary: "Every public Society event, in English or Arabic (lang=ar).",
  },
  {
    path: "/api/calendar/events/{slug}.ics?lang=en",
    summary: "One event, to add to a calendar.",
  },
] as const;

export const signIn = {
  authorize: "/auth/v1/oauth/authorize",
  discovery: "/auth/v1/.well-known/openid-configuration",
  token: "/auth/v1/oauth/token",
} as const;
