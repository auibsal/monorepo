"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import { Textarea } from "@repo/brand/components/ui/textarea";
import { apiPath } from "@repo/internationalization";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { useHumanCheck } from "@/components/diwan/auth/human-check";
import { useAuth } from "@/lib/auth/provider";

type State = "idle" | "sending" | "sent" | "failed" | "rate_limited";

/** A path on this site, from ?from= (the page the link was on). */
const PATH = /^\/[^\s]{0,499}$/u;

/**
 * "Report a problem" (decisions.md, The site): to the web lead in the
 * Diwan. Signed in, the account goes with it; otherwise an address for a
 * reply is optional. The confirmation stays on the page.
 */
export const ReportProblem = () => {
  const t = useTranslations("diwan.report");
  const locale = useLocale();
  const id = useId();
  const { supabase, user } = useAuth();
  const params = useSearchParams();
  const from = params.get("from") ?? "";
  const [page, setPage] = useState(PATH.test(from) ? from : "/");
  const [state, setState] = useState<State>("idle");
  const human = useHumanCheck("problem-report");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setState("sending");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const response = await fetch(apiPath("/problems"), {
        body: JSON.stringify({
          lang: locale === "ar" ? "ar" : "en",
          message: data.get("message"),
          page,
          replyTo: data.get("replyTo") || null,
          token: human.token,
          website: data.get("website") || undefined,
        }),
        headers: {
          "content-type": "application/json",
          ...(session
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        method: "POST",
      });
      if (response.status === 429) {
        setState("rate_limited");
      } else {
        setState(response.ok ? "sent" : "failed");
      }
    } catch {
      setState("failed");
    } finally {
      human.reset();
    }
  };

  if (state === "sent") {
    return (
      <p className="type-body border-line border-t pt-4" role="status">
        {t("sent")}
      </p>
    );
  }
  return (
    <form className="grid max-w-xl gap-5" onSubmit={submit}>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-page`}>{t("page")}</Label>
        <Input
          dir="ltr"
          id={`${id}-page`}
          onChange={(event) => setPage(event.target.value)}
          required
          value={page}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-message`}>{t("message")}</Label>
        <Textarea
          aria-describedby={`${id}-message-hint`}
          id={`${id}-message`}
          maxLength={2000}
          minLength={5}
          name="message"
          required
          rows={6}
        />
        <p className="type-caption" id={`${id}-message-hint`}>
          {t("messageHint")}
        </p>
      </div>
      {user ? (
        <p className="type-caption">{t("signedIn")}</p>
      ) : (
        <div className="grid gap-2">
          <Label htmlFor={`${id}-reply`}>{t("replyTo")}</Label>
          <Input
            autoComplete="email"
            dir="ltr"
            id={`${id}-reply`}
            name="replyTo"
            type="email"
          />
        </div>
      )}
      <input
        aria-hidden="true"
        autoComplete="off"
        className="hidden"
        name="website"
        tabIndex={-1}
      />
      {user ? null : human.element}
      {state === "failed" || state === "rate_limited" ? (
        <p className="type-body font-medium" role="alert">
          {t(state)}
        </p>
      ) : null}
      <Button
        className="justify-self-end"
        disabled={state === "sending" || !(user || human.ready)}
        type="submit"
      >
        {t("send")}
      </Button>
    </form>
  );
};
