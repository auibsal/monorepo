import { STATUS_CODES } from "node:http";

/**
 * One error shape for every API route: RFC 9457 problem details
 * (`application/problem+json`), with the route's short code kept as the
 * `error` extension member, which the Diwan's `callApi` reads.
 */
interface Problem {
  /** The route's short code, for example "invalid_request". */
  readonly error: string;
  readonly status: number;
  readonly title: string;
  readonly type: "about:blank";
}

const problemBody = (status: number, error: string): Problem => ({
  error,
  status,
  title: STATUS_CODES[status] ?? "Error",
  type: "about:blank",
});

const PROBLEM_TYPE = "application/problem+json";

/** A problem response; `headers` carry CORS and the like. */
export const problem = (
  status: number,
  error: string,
  headers: HeadersInit = {}
) => {
  const all = new Headers(headers);
  all.set("Content-Type", PROBLEM_TYPE);
  return new Response(JSON.stringify(problemBody(status, error)), {
    headers: all,
    status,
  });
};

const isErrorBody = (data: object): data is { error: string } =>
  typeof (data as { error?: unknown }).error === "string";

/**
 * A route's JSON replies with its headers: success as JSON, and an
 * `{ error }` reply at 4xx or 5xx as a problem.
 */
export const respond =
  (headers: HeadersInit = {}) =>
  (data: object, status = 200) =>
    status >= 400 && isErrorBody(data)
      ? problem(status, data.error, headers)
      : Response.json(data, { headers, status });
