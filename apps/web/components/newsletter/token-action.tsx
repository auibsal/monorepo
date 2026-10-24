"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { apiPath } from "@repo/internationalization";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

type State = "idle" | "sending" | "done" | "invalid" | "failed";

/**
 * The button behind an emailed link (confirm or unsubscribe). The link only
 * opens this page; the button sends the token, so mail scanners that open
 * links change nothing.
 */
export const TokenAction = ({
  action,
}: {
  action: "confirm" | "unsubscribe";
}) => {
  const t = useTranslations(`web.newsletter.${action}`);
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<State>(token ? "idle" : "invalid");

  const run = async () => {
    setState("sending");
    try {
      const response = await fetch(apiPath(`/newsletter/${action}`), {
        body: JSON.stringify({ token }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      if (response.ok) {
        setState("done");
      } else {
        setState(response.status === 400 ? "invalid" : "failed");
      }
    } catch {
      setState("failed");
    }
  };

  if (state === "done" || state === "invalid") {
    return (
      <p className="type-lede" role="status">
        {t(state)}
      </p>
    );
  }
  return (
    <div className="grid justify-items-start gap-3">
      <Button disabled={state === "sending"} onClick={run} type="button">
        {t("button")}
      </Button>
      {state === "failed" ? (
        <p className="text-title" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </div>
  );
};
