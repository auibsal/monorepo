"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import { apiPath } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  type FormEvent,
  lazy,
  Suspense,
  useEffect,
  useId,
  useState,
} from "react";
import { ResultLine } from "@/components/frame/result-line";
import { hasSessionCookie } from "@/lib/auth/session-cookie";

// The human check loads once someone starts typing an address: the sign-up
// shows on many pages, and readers should never load the script.
const HumanCheck = lazy(() =>
  import("@/components/diwan/auth/human-check").then((m) => ({
    default: m.HumanCheck,
  }))
);

type State =
  | "idle"
  | "sending"
  | "sent"
  | "invalid_email"
  | "no_topic"
  | "rate_limited"
  | "failed";

/**
 * Signs up for the Sunday Paper; the API routes send the confirmation
 * email. Compact, where the page already has its one solid button, the
 * submit is a text link. A signed-in member already gets it while email
 * notices are on (decisions.md: never ask them to subscribe again),
 * so they see where to turn it on or off instead. Read after the first
 * render, so the cached page is the same for everyone.
 */
export const NewsletterSignup = ({
  compact = false,
}: {
  compact?: boolean;
}) => {
  const t = useTranslations("web.newsletter");
  const locale = useLocale();
  const id = useId();
  const [state, setState] = useState<State>("idle");
  const [member, setMember] = useState(false);
  const [started, setStarted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  useEffect(() => {
    if (!hasSessionCookie(document.cookie)) {
      return;
    }
    let live = true;
    // Only for someone signed in, and loaded then: visitors never fetch it.
    import("@/lib/diwan/supabase")
      .then(({ getSupabase }) =>
        getSupabase().schema("membership").rpc("my_membership")
      )
      .then(({ data }) => {
        const row = (Array.isArray(data) ? data[0] : data) as {
          kind?: string;
        } | null;
        if (live && row?.kind === "member") {
          setMember(true);
        }
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setState("sending");
    try {
      const response = await fetch(apiPath("/newsletter/subscribe"), {
        body: JSON.stringify({
          email: data.get("email"),
          lang: locale === "ar" ? "ar" : "en",
          // The two topics (decisions.md, Channels and email); the compact
          // form, where the Sunday Paper is offered, asks for it alone.
          news: compact ? false : data.get("news") === "on",
          paper: compact ? true : data.get("paper") === "on",
          token,
          website: data.get("website") || undefined,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (response.ok) {
        setState("sent");
      } else if (response.status === 429) {
        setState("rate_limited");
      } else if (result.error === "invalid_email") {
        setState("invalid_email");
      } else if (result.error === "no_topic") {
        setState("no_topic");
      } else {
        setState("failed");
      }
    } catch {
      setState("failed");
    } finally {
      // A token is good once: a fresh check for the next try.
      setToken(null);
      setRound((n) => n + 1);
    }
  };

  if (member) {
    return (
      <p className="type-body">
        {t("members")}{" "}
        <Link className="link" href="/account/settings/notifications">
          {t("notices")}
        </Link>
      </p>
    );
  }

  if (state === "sent") {
    return <ResultLine kind="done">{t("sent")}</ResultLine>;
  }

  return (
    <form className="grid gap-3" noValidate onSubmit={submit}>
      <Label htmlFor={`${id}-email`}>{t("email")}</Label>
      <div className={compact ? "flex flex-wrap gap-2" : "grid gap-3 sm:flex"}>
        <Input
          autoComplete="email"
          className="min-w-0 flex-1"
          dir="ltr"
          id={`${id}-email`}
          name="email"
          onFocus={() => setStarted(true)}
          required
          type="email"
        />
        <Button
          disabled={state === "sending" || (started && token === null)}
          type="submit"
          variant={compact ? "link" : "default"}
        >
          {state === "sending" ? t("sending") : t("submit")}
        </Button>
      </div>
      {compact ? null : (
        <fieldset className="grid gap-2">
          <legend className="type-label mb-2">{t("topics.legend")}</legend>
          <div className="flex items-center gap-2">
            <Checkbox defaultChecked id={`${id}-paper`} name="paper" />
            <Label htmlFor={`${id}-paper`}>{t("topics.paper")}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id={`${id}-news`} name="news" />
            <Label htmlFor={`${id}-news`}>{t("topics.news")}</Label>
          </div>
        </fieldset>
      )}
      {started ? (
        <Suspense fallback={null}>
          <HumanCheck action="newsletter" key={round} onToken={setToken} />
        </Suspense>
      ) : null}
      {/* Hidden from people; bots fill it in. */}
      <div aria-hidden className="hidden">
        <label>
          {t("website")}
          <input autoComplete="off" name="website" tabIndex={-1} type="text" />
        </label>
      </div>
      {state === "invalid_email" ||
      state === "no_topic" ||
      state === "rate_limited" ||
      state === "failed" ? (
        <p className="text-text" role="alert">
          {t(`errors.${state}`)}
        </p>
      ) : null}
      <p className="type-caption">{t("fineprint")}</p>
    </form>
  );
};
