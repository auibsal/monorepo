/**
 * Reading the reports browsers send about the Content Security Policy
 * (app/api/csp-report).
 */
export interface Violation {
  blocked: string;
  directive: string;
  disposition: string;
  page: string;
  source: string;
}

type Body = Record<string, unknown>;

const text = (value: unknown) => (typeof value === "string" ? value : "");

/**
 * An address without its query or fragment, which could carry a code or a
 * token; keywords such as "inline" and "eval" pass as they are.
 */
export const withoutQuery = (value: string) => {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value.slice(0, 100);
  }
};

const violation = (
  body: Body,
  names: Record<keyof Violation, string>
): Violation => ({
  blocked: withoutQuery(text(body[names.blocked])),
  directive: text(body[names.directive]).slice(0, 60),
  disposition: text(body[names.disposition]).slice(0, 20),
  page: withoutQuery(text(body[names.page])),
  source: withoutQuery(text(body[names.source])),
});

/** The violations in a report, in either format browsers send. */
export const violationsIn = (payload: unknown): Violation[] => {
  // The Reporting API (report-to): an array of reports.
  if (Array.isArray(payload)) {
    return payload
      .filter(
        (entry): entry is { body: Body } =>
          typeof entry === "object" &&
          entry !== null &&
          (entry as Body).type === "csp-violation" &&
          typeof (entry as Body).body === "object"
      )
      .slice(0, 10)
      .map(({ body }) =>
        violation(body, {
          blocked: "blockedURL",
          directive: "effectiveDirective",
          disposition: "disposition",
          page: "documentURL",
          source: "sourceFile",
        })
      );
  }
  // The older report-uri: one report under "csp-report".
  const report =
    typeof payload === "object" && payload !== null
      ? (payload as Body)["csp-report"]
      : null;
  if (typeof report !== "object" || report === null) {
    return [];
  }
  return [
    violation(report as Body, {
      blocked: "blocked-uri",
      directive: "effective-directive",
      disposition: "disposition",
      page: "document-uri",
      source: "source-file",
    }),
  ];
};
