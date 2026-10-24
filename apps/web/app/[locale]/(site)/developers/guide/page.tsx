import { apiUrl } from "@repo/internationalization";
import type { Metadata } from "next";
import { Block, Code } from "@/components/developers";
import { env } from "@/env";
import { signIn } from "@/lib/api/endpoints";

export const metadata: Metadata = { title: "Guide" };

/** How an app signs a member in and calls the API, step by step. */
const GuidePage = () => {
  const auth =
    env.NEXT_PUBLIC_SUPABASE_URL ?? "https://<the Society's auth host>";
  const steps = [
    {
      body: (
        <>
          Send the member to{" "}
          <Code>
            {auth}
            {signIn.authorize}
          </Code>{" "}
          with your client id, your redirect address, a PKCE code challenge and{" "}
          <Code>scope=openid email profile</Code>. Discovery for OpenID Connect
          is at{" "}
          <Code>
            {auth}
            {signIn.discovery}
          </Code>
          .
        </>
      ),
      title: "Send the member to sign in",
    },
    {
      body: (
        <>
          The member signs in and lands on the Diwan consent page, which names
          your app and lists what it can do. They allow it or refuse it. Apps
          the Society has not approved can only be refused.
        </>
      ),
      title: "The member allows your app",
    },
    {
      body: (
        <>
          Exchange the code at{" "}
          <Code>
            {auth}
            {signIn.token}
          </Code>{" "}
          for an access token (valid for one hour) and a refresh token. Public
          apps (in a browser or on a phone) use PKCE without a secret; apps with
          a server can hold a client secret.
        </>
      ),
      title: "Get tokens",
    },
    {
      body: (
        <>
          Call <Code>{apiUrl("/v1")}/…</Code> with{" "}
          <Code>Authorization: Bearer &lt;access token&gt;</Code>. Each request
          runs as that member. Start with <Code>GET /api/v1/me</Code> to learn
          their name, language and permissions.
        </>
      ),
      title: "Call the API as the member",
    },
  ];

  return (
    <div
      className="mx-auto grid w-full max-w-5xl gap-12 px-4 py-12"
      dir="ltr"
      lang="en"
    >
      <header className="grid gap-4">
        <h1 className="type-display">Guide</h1>
        <p className="type-lede max-w-3xl">
          Sign in with SAL is a standard OAuth 2.1 authorization-code flow with
          PKCE. Four steps take a member from your app to an API call.
        </p>
      </header>

      <Block id="flow" title="Signing a member in">
        <ol className="grid gap-4">
          {steps.map((s, i) => (
            <li className="grid gap-1 border-line border-t p-5" key={s.title}>
              <h3 className="type-subheading">{s.title}</h3>
              <p className="type-caption">Step {i + 1}</p>
              <p className="type-body">{s.body}</p>
            </li>
          ))}
        </ol>
      </Block>

      <Block id="areas" title="Areas and permissions">
        <p className="type-body">
          OAuth scopes only shape the ID token; they do not limit data. What
          your app reaches is set by the areas the Society grants it, such as
          name and language, Qirtas, events, programs, pages and news, and
          inside those areas by what the member may do. Some decisions (an
          editor deciding on a piece, officers' actions) count only after the
          member finishes two-step sign-in, so your app may need to send them
          back to sign in again.
        </p>
      </Block>

      <Block id="disconnect" title="When a member disconnects">
        <p className="type-body">
          Members disconnect apps in the Diwan under Profile and privacy, and
          officers can switch an app off for everyone. Either ends its access at
          once: its refreshes and calls for that member stop working. Delete
          what you hold for them.
        </p>
      </Block>

      <Block id="next" title="Coming later">
        <ul className="grid list-disc gap-2 ps-6">
          <li className="type-body">
            File submissions, through signed upload links.
          </li>
          <li className="type-body">
            Webhooks when a submission or decision changes.
          </li>
          <li className="type-body">An OpenAPI description of /v1.</li>
        </ul>
      </Block>
    </div>
  );
};

export default GuidePage;
