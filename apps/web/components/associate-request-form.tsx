"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import { Textarea } from "@repo/brand/components/ui/textarea";
import { apiPath } from "@repo/internationalization";
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { useHumanCheck } from "@/components/diwan/auth/human-check";

type State = "idle" | "sending" | "sent" | "failed" | "rate_limited";

const RELATIONS = ["faculty", "staff", "alumni"] as const;

/**
 * Request Associate membership (decisions §2, §12): faculty, staff and
 * alumni ask here, at the Tour's station too; the Director of Membership
 * answers by a named invitation, or with a reason. Posts to the API routes
 * /associate-requests; no sign-in needed.
 */
export const AssociateRequestForm = () => {
  const t = useTranslations("web.join.associateRequest");
  const id = useId();
  const [state, setState] = useState<State>("idle");
  const human = useHumanCheck("associate-request");
  const [relation, setRelation] =
    useState<(typeof RELATIONS)[number]>("faculty");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setState("sending");
    try {
      const response = await fetch(apiPath("/associate-requests"), {
        body: JSON.stringify({
          email: data.get("email"),
          full_name: data.get("full_name"),
          note: data.get("note") || undefined,
          relation,
          token: human.token,
          website: data.get("website") || undefined,
        }),
        headers: { "content-type": "application/json" },
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
    <form className="grid max-w-2xl gap-4" onSubmit={submit}>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-name`}>{t("name")}</Label>
        <Input
          autoComplete="name"
          id={`${id}-name`}
          maxLength={120}
          minLength={2}
          name="full_name"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-email`}>{t("email")}</Label>
        <Input
          autoComplete="email"
          dir="ltr"
          id={`${id}-email`}
          name="email"
          required
          type="email"
        />
      </div>
      <fieldset className="grid gap-2">
        <legend className="type-label mb-2">{t("relation")}</legend>
        {RELATIONS.map((value) => (
          <label className="flex items-center gap-2" key={value}>
            <input
              checked={relation === value}
              name="relation"
              onChange={() => setRelation(value)}
              type="radio"
              value={value}
            />
            <span className="type-body">{t(`relations.${value}`)}</span>
          </label>
        ))}
      </fieldset>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-note`}>{t("note")}</Label>
        <Textarea id={`${id}-note`} maxLength={1000} name="note" rows={3} />
      </div>
      {/* Hidden from people; bots fill it in. */}
      <input
        aria-hidden="true"
        autoComplete="off"
        className="hidden"
        name="website"
        tabIndex={-1}
      />
      {human.element}
      <Button
        className="justify-self-start"
        disabled={state === "sending" || !human.ready}
        type="submit"
      >
        {t("send")}
      </Button>
      {state === "failed" ? (
        <p className="text-text text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}
      {state === "rate_limited" ? (
        <p className="text-text text-sm" role="alert">
          {t("rateLimited")}
        </p>
      ) : null}
    </form>
  );
};
