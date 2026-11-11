"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Label } from "@repo/brand/components/ui/label";
import { apiPath } from "@repo/internationalization";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";

interface Topics {
  news: boolean;
  paper: boolean;
}

type State = "loading" | "ready" | "saving" | "saved" | "failed";

/**
 * The no-login preferences page (decisions.md, Channels and email): the
 * two topics a reader leaves separately, "The Sunday Paper" and "Society
 * news and events". Members' links carry a signed token (/email/stop), the
 * public's the subscription's (/newsletter/unsubscribe). Unsubscribing
 * from everything stays a button of its own below.
 */
export const TopicPreferences = ({
  kind,
}: {
  readonly kind: "member" | "public";
}) => {
  const t = useTranslations("web.newsletter");
  const id = useId();
  const token = useSearchParams().get("token") ?? "";
  const path = kind === "member" ? "/email/stop" : "/newsletter/unsubscribe";
  const [topics, setTopics] = useState<Topics | null>(null);
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (!token) {
      return;
    }
    let live = true;
    fetch(`${apiPath(path)}?token=${encodeURIComponent(token)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: Topics | null) => {
        if (live && data) {
          setTopics(data);
          setState("ready");
        }
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [path, token]);

  if (!(token && topics)) {
    return null;
  }

  const save = async () => {
    setState("saving");
    try {
      const response = await fetch(apiPath(path), {
        body: JSON.stringify({ token, topics }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      setState(response.ok ? "saved" : "failed");
    } catch {
      setState("failed");
    }
  };

  return (
    <fieldset className="grid justify-items-start gap-3">
      <legend className="type-label mb-2">{t("topics.legend")}</legend>
      {(["paper", "news"] as const).map((topic) => (
        <div className="flex items-center gap-2" key={topic}>
          <Checkbox
            checked={topics[topic]}
            id={`${id}-${topic}`}
            onCheckedChange={(value) => {
              setTopics({ ...topics, [topic]: value === true });
              setState("ready");
            }}
          />
          <Label htmlFor={`${id}-${topic}`}>{t(`topics.${topic}`)}</Label>
        </div>
      ))}
      <Button
        disabled={state === "saving"}
        onClick={save}
        type="button"
        variant="outline"
      >
        {t("unsubscribe.save")}
      </Button>
      {state === "saved" ? (
        <p className="type-body" role="status">
          {t("unsubscribe.saved")}
        </p>
      ) : null}
      {state === "failed" ? (
        <p className="text-text" role="alert">
          {t("unsubscribe.failed")}
        </p>
      ) : null}
    </fieldset>
  );
};
