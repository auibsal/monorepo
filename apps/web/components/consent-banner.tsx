"use client";

import {
  hasChoice,
  OPEN_CONSENT,
  saveChoice,
  zarazConsent,
} from "@repo/analytics/consent";
import { Button } from "@repo/design-system/components/ui/button";
import { Link } from "@repo/internationalization/navigation";
import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

interface ConsentBannerProps {
  /** The Zaraz consent purpose for analytics. */
  readonly purpose: string;
}

type State = "hidden" | "first" | "settings";

/**
 * The analytics consent card: pinned to the bottom of the page, never in
 * the way of the page itself. It appears until the visitor answers, and
 * again from "Cookie settings" in the footer. The answer is stored by
 * Cloudflare Zaraz (its own consent window stays off), and the boot script
 * passes it on to Google consent mode.
 */
export const ConsentBanner = ({ purpose }: ConsentBannerProps) => {
  const t = useTranslations("web.consent");
  const [state, setState] = useState<State>("hidden");
  const [allowed, setAllowed] = useState(false);
  const card = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const ready = () => {
      const api = zarazConsent();
      if (!api) {
        return;
      }
      // Only this card asks; never Zaraz's window on top of the page.
      if (api.modal) {
        api.modal = false;
      }
      if (!hasChoice(document.cookie, purpose)) {
        setState((now) => (now === "hidden" ? "first" : now));
      }
    };
    const open = () => {
      const api = zarazConsent();
      if (!api) {
        return;
      }
      opener.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setAllowed(api.get(purpose) === true);
      setState(hasChoice(document.cookie, purpose) ? "settings" : "first");
    };
    ready();
    document.addEventListener("zarazConsentAPIReady", ready);
    document.addEventListener(OPEN_CONSENT, open);
    return () => {
      document.removeEventListener("zarazConsentAPIReady", ready);
      document.removeEventListener(OPEN_CONSENT, open);
    };
  }, [purpose]);

  useEffect(() => {
    // Opened from the footer: take the visitor straight to the card.
    if (state === "settings") {
      card.current?.focus();
    }
  }, [state]);

  const close = () => {
    setState("hidden");
    opener.current?.focus();
    opener.current = null;
  };

  const answer = (allow: boolean) => {
    const api = zarazConsent();
    if (api) {
      saveChoice(api, purpose, allow);
    }
    close();
  };

  if (state === "hidden") {
    return null;
  }

  return (
    <section
      aria-labelledby="consent-title"
      className="fixed inset-x-4 bottom-4 z-40 grid gap-3 rounded-card border border-rule bg-surface-tint p-4 text-text outline-none sm:inset-x-auto sm:end-4 sm:w-96"
      ref={card}
      tabIndex={-1}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="type-kicker text-title" id="consent-title">
          {t("title")}
        </h2>
        {state === "settings" ? (
          <button
            aria-label={t("close")}
            className="-m-1 p-1 text-text-secondary hover:text-text"
            onClick={close}
            type="button"
          >
            <XIcon aria-hidden="true" className="size-4" />
          </button>
        ) : null}
      </div>
      <p className="type-caption">
        {t("body")}{" "}
        <Link className="underline underline-offset-4" href="/privacy">
          {t("privacy")}
        </Link>
      </p>
      {state === "settings" ? (
        <p className="type-caption text-text-secondary">
          {allowed ? t("nowAllowed") : t("nowDeclined")}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <Button onClick={() => answer(true)} size="sm" variant="outline">
          {t("allow")}
        </Button>
        <Button onClick={() => answer(false)} size="sm" variant="outline">
          {t("decline")}
        </Button>
      </div>
    </section>
  );
};
