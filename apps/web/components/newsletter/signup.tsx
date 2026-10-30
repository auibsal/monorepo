"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { apiPath } from "@repo/internationalization";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { ResultLine } from "@/components/frame/result-line";

type State =
  | "idle"
  | "sending"
  | "sent"
  | "invalid_email"
  | "rate_limited"
  | "failed";

/**
 * Signs up for the Sunday Paper; the API routes send the confirmation
 * email. Compact, where the page already has its one solid button, the
 * submit is a text link.
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

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setState("sending");
    try {
      const response = await fetch(apiPath("/newsletter/subscribe"), {
        body: JSON.stringify({
          email: data.get("email"),
          lang: locale === "ar" ? "ar" : "en",
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
      } else {
        setState("failed");
      }
    } catch {
      setState("failed");
    }
  };

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
          required
          type="email"
        />
        <Button
          disabled={state === "sending"}
          type="submit"
          variant={compact ? "link" : "default"}
        >
          {state === "sending" ? t("sending") : t("submit")}
        </Button>
      </div>
      {/* Hidden from people; bots fill it in. */}
      <div aria-hidden className="hidden">
        <label>
          {t("website")}
          <input autoComplete="off" name="website" tabIndex={-1} type="text" />
        </label>
      </div>
      {state === "invalid_email" ||
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
