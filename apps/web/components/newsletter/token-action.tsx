"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { apiPath } from "@repo/internationalization";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

type State = "idle" | "sending" | "done" | "invalid" | "in_use" | "failed";
type Action = "confirm" | "unsubscribe" | "personalEmail" | "stopEmails";

const namespaces = {
  confirm: "web.newsletter.confirm",
  personalEmail: "web.personalEmail",
  stopEmails: "web.stopEmails",
  unsubscribe: "web.newsletter.unsubscribe",
} as const;
const paths: Record<Action, string> = {
  confirm: "/newsletter/confirm",
  personalEmail: "/personal-email/confirm",
  stopEmails: "/email/stop",
  unsubscribe: "/newsletter/unsubscribe",
};

/**
 * The button behind an emailed link (the newsletter's confirm and
 * unsubscribe, a personal email's confirm, a member's "stop these
 * emails"). The link only
 * opens this page; the button sends the token, so mail scanners that open
 * links change nothing.
 */
export const TokenAction = ({ action }: { action: Action }) => {
  const t = useTranslations(namespaces[action]);
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<State>(token ? "idle" : "invalid");

  const run = async () => {
    setState("sending");
    try {
      const response = await fetch(apiPath(paths[action]), {
        body: JSON.stringify({ token }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      if (response.ok) {
        setState("done");
      } else {
        const byStatus: Partial<Record<number, State>> = {
          400: "invalid",
          409: "in_use",
        };
        setState(byStatus[response.status] ?? "failed");
      }
    } catch {
      setState("failed");
    }
  };

  if (state === "done" || state === "invalid" || state === "in_use") {
    return (
      <p className="type-lede" role="status">
        {t(state as "done")}
      </p>
    );
  }
  return (
    <div className="grid justify-items-start gap-3">
      <Button disabled={state === "sending"} onClick={run} type="button">
        {t("button")}
      </Button>
      {state === "failed" ? (
        <p className="text-text" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </div>
  );
};
