import { project } from "@repo/config";
import { apiUrl } from "@repo/internationalization";
import type { Metadata } from "next";
import { Block, Code } from "@/components/developers";
import { endpoints, feeds } from "@/lib/api/endpoints";

export const metadata: Metadata = { title: "Reference" };

const errors = [
  [
    "400",
    "invalid_body, issue_required, or a database code",
    "The input failed validation; detail lists the problems.",
  ],
  ["401", "unauthorized", "No token, or a token that is expired or not valid."],
  ["403", "42501", "The member, or the app, may not do this."],
  ["404", "not_found", "Nothing there, or nothing this member may see."],
  [
    "409",
    "23505",
    "It already exists (for example, a second submission where one is allowed).",
  ],
  ["500", "server_error", "Something failed on our side."],
] as const;

/** Every /api/v1 endpoint, from the same list GET /api/v1 returns. */
const ReferencePage = () => (
  <div
    className="mx-auto grid w-full max-w-5xl gap-12 px-4 py-12"
    dir="ltr"
    lang="en"
  >
    <header className="grid gap-4">
      <h1 className="type-display">Reference</h1>
      <p className="type-lede max-w-3xl">
        Version 1, at <Code>{apiUrl("/v1")}</Code>. JSON in and out. Send{" "}
        <Code>Authorization: Bearer &lt;access token&gt;</Code>; the API takes
        no cookies, so any origin may call it.
      </p>
    </header>

    <Block id="endpoints" title="Endpoints">
      <ul className="grid gap-3">
        {endpoints.map((e) => (
          <li
            className="grid gap-2 border-line border-t p-4"
            key={`${e.method} ${e.path}`}
          >
            <p className="flex flex-wrap items-baseline justify-between gap-2">
              <Code>
                {e.method} {e.path}
              </Code>
              <span className="type-caption text-text-secondary">{e.who}</span>
            </p>
            <p className="type-body">{e.summary}</p>
            {e.accepts ? (
              <p className="type-caption text-text-secondary">
                Takes: <span dir="ltr">{e.accepts}</span>
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="type-body">
        The database enforces the call windows, the limit per member, the rubric
        and who may make which move. The API adds no rules of its own.
      </p>
    </Block>

    <Block id="errors" title="Errors">
      <p className="type-body">
        Errors are <Code>{'{ "error": "<code>", "detail": … }'}</Code> with
        these statuses:
      </p>
      <dl className="grid gap-2">
        {errors.map(([status, code, meaning]) => (
          <div
            className="grid gap-1 sm:grid-cols-[4rem_16rem_1fr]"
            key={status}
          >
            <dt className="font-bold tabular-nums">{status}</dt>
            <dd>
              <Code>{code}</Code>
            </dd>
            <dd>{meaning}</dd>
          </div>
        ))}
      </dl>
    </Block>

    <Block id="feeds" title="Calendar feeds">
      <ul className="grid gap-2">
        {feeds.map((f) => (
          <li className="type-body" key={f.path}>
            <Code>
              GET {project.url}
              {f.path}
            </Code>{" "}
            — {f.summary}
          </li>
        ))}
      </ul>
      <p className="type-body">
        Members also have a private feed of the events they booked, with its own
        link in the Nexus. Treat it like a password.
      </p>
    </Block>
  </div>
);

export default ReferencePage;
