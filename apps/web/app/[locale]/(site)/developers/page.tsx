import { project } from "@repo/config";
import { apiUrl } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { Block, Code } from "@/components/developers";

const offers = [
  {
    body: "Members sign in to your app with their Society account (OAuth 2.1 with PKCE, and OpenID Connect). They see what your app asks for and can disconnect it at any time.",
    title: "Sign in with SAL",
  },
  {
    body: "Read Qirtas's open calls and editions, submit work, read and score blind entries, and record editorial decisions, always as the member who signed in.",
    title: "The Qirtas API",
  },
  {
    body: "Every public Society event as an iCal feed, in English or Arabic, for any calendar app. No sign-in needed.",
    title: "Calendar feeds",
  },
] as const;

const safeguards = [
  "Every request runs as the member who signed in: an app can do only what that member could do in the Diwan.",
  "The Society approves each app and grants it areas. Membership records, elections and ballots, the charity ledger and roles are never open to apps.",
  "Blind review holds: readers get the text and a blind id, never the author.",
  "The limits live in the database, behind row-level security, where an app cannot get around them.",
] as const;

/** auibsal.org/developers: what the Society's API is, before the reference. */
const OverviewPage = () => (
  <div
    className="mx-auto grid w-full max-w-5xl gap-12 px-4 py-12"
    dir="ltr"
    lang="en"
  >
    <header className="grid gap-4">
      <h1 className="type-display">The Society's API</h1>
      <p className="type-lede max-w-3xl">
        Build tools for the Society's members: sign them in with their Society
        account and work with Qirtas on their behalf, inside rules the Society
        sets and the database enforces.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          className="type-label rounded-md bg-primary px-4 py-2 text-primary-foreground text-xs"
          href="/developers/guide"
        >
          Read the guide
        </Link>
        <Link
          className="type-label rounded-md border border-line px-4 py-2 text-xs"
          href="/developers/reference"
        >
          See the reference
        </Link>
      </div>
    </header>

    <Block id="offers" title="What you can build with">
      <ul className="grid gap-4 md:grid-cols-3">
        {offers.map((o) => (
          <li
            className="grid content-start gap-2 border-line border-t p-5"
            key={o.title}
          >
            <h3 className="type-subheading">{o.title}</h3>
            <p className="type-body">{o.body}</p>
          </li>
        ))}
      </ul>
    </Block>

    <Block id="access" title="Getting access">
      <ol className="grid list-decimal gap-2 ps-6">
        <li className="type-body">
          Write to{" "}
          <a
            className="underline underline-offset-4"
            href={`mailto:${project.supportEmail}`}
          >
            {project.supportEmail}
          </a>{" "}
          with what your app does, who runs it, its redirect addresses and the
          areas it needs.
        </li>
        <li className="type-body">
          The Society registers the app, approves it and sends you its client id
          privately.
        </li>
        <li className="type-body">
          Members connect your app from a sign-in page in the Diwan, and you
          call the API with their token.
        </li>
      </ol>
      <p className="type-body">
        Apps are approved for teams the Society trusts, such as a program's own
        tools. Every app follows the{" "}
        <a
          className="underline underline-offset-4"
          href={`${project.url}/library/api-terms`}
        >
          API Terms and Developer Policy
        </a>
        .
      </p>
    </Block>

    <Block id="safety" title="What keeps members safe">
      <ul className="grid list-disc gap-2 ps-6">
        {safeguards.map((s) => (
          <li className="type-body" key={s}>
            {s}
          </li>
        ))}
      </ul>
    </Block>

    <Block id="start" title="Try it">
      <p className="type-body">
        <Code>GET {apiUrl("/v1")}</Code> answers without a token: it lists the
        endpoints and the sign-in addresses.
      </p>
    </Block>
  </div>
);

export default OverviewPage;
