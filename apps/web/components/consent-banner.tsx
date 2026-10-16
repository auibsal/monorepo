"use client";

import {
  CONSENT_SAVED,
  currentChoice,
  hasChoice,
  OPEN_CONSENT,
  saveChoice,
  zarazConsent,
} from "@repo/analytics/consent";
import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Label } from "@repo/design-system/components/ui/label";
import { Link } from "@repo/internationalization/navigation";
import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

/** The Zaraz consent purposes the site asks about. */
export interface ConsentPurposes {
  ads?: string;
  analytics?: string;
}

interface ConsentBannerProps {
  readonly purposes: ConsentPurposes;
}

type State = "hidden" | "first" | "choose";
type Topic = keyof ConsentPurposes;

const topics = (purposes: ConsentPurposes) =>
  (["analytics", "ads"] as const).filter((topic) => purposes[topic]);

/**
 * The consent card: pinned to the bottom of the page, never in the way of
 * the page itself. It asks until the visitor has answered for every purpose,
 * and again from "Cookie settings" in the footer. The answers are kept in the
 * site's own consent cookie and passed on to Cloudflare Zaraz where Zaraz
 * stores them (its own consent window stays off); the boot script passes
 * them on to Google consent mode.
 */
export const ConsentBanner = ({ purposes }: ConsentBannerProps) => {
  const t = useTranslations("web.consent");
  const id = useId();
  const [state, setState] = useState<State>("hidden");
  const [allowed, setAllowed] = useState<Record<Topic, boolean>>({
    ads: false,
    analytics: false,
  });
  const [answered, setAnswered] = useState(false);
  const card = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const asked = topics(purposes);
  const key = asked.map((topic) => purposes[topic] ?? "").join(",");

  useEffect(() => {
    const purposeIds = key.split(",").filter(Boolean);
    const allAnswered = () =>
      purposeIds.every((purpose) => hasChoice(document.cookie, purpose));
    const ready = () => {
      const api = zarazConsent();
      if (!api) {
        return;
      }
      // Only this card asks; never Zaraz's window on top of the page.
      if (api.modal) {
        api.modal = false;
      }
      if (purposeIds.length > 0 && !allAnswered()) {
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
      const isAllowed = (purpose: string | undefined) =>
        Boolean(purpose && currentChoice(api, document.cookie, purpose));
      setAllowed({
        ads: isAllowed(purposes.ads),
        analytics: isAllowed(purposes.analytics),
      });
      setAnswered(allAnswered());
      setState("choose");
    };
    ready();
    document.addEventListener("zarazConsentAPIReady", ready);
    document.addEventListener(OPEN_CONSENT, open);
    return () => {
      document.removeEventListener("zarazConsentAPIReady", ready);
      document.removeEventListener(OPEN_CONSENT, open);
    };
  }, [key, purposes.ads, purposes.analytics]);

  useEffect(() => {
    // Opened from the footer or "Choose": take the visitor to the card.
    if (state === "choose") {
      card.current?.focus();
    }
  }, [state]);

  const close = () => {
    setState("hidden");
    opener.current?.focus();
    opener.current = null;
  };

  const save = (choice: Record<Topic, boolean>) => {
    saveChoice(
      zarazConsent(),
      Object.fromEntries(
        asked.map((topic) => [purposes[topic] ?? "", choice[topic]])
      ),
      {
        read: () => document.cookie,
        write: (cookie) => {
          // biome-ignore lint/suspicious/noDocumentCookie: the site's own consent record
          document.cookie = cookie;
        },
      }
    );
    document.dispatchEvent(new Event(CONSENT_SAVED));
    close();
  };

  if (state === "hidden" || asked.length === 0) {
    return null;
  }

  const body = purposes.ads ? t("bodyWithAds") : t("body");

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="fixed inset-x-4 bottom-4 z-40 grid max-h-[80dvh] gap-3 overflow-y-auto rounded-card border border-rule bg-surface-tint p-4 text-text outline-none sm:inset-x-auto sm:end-4 sm:w-96"
      ref={card}
      tabIndex={-1}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="type-kicker text-title" id={`${id}-title`}>
          {t("title")}
        </h2>
        {state === "choose" && answered ? (
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
        {body}{" "}
        <Link className="underline underline-offset-4" href="/privacy">
          {t("privacy")}
        </Link>
      </p>
      {state === "choose" ? (
        <fieldset className="grid gap-3">
          <legend className="sr-only">{t("choices")}</legend>
          {asked.map((topic) => (
            <div className="flex items-start gap-3" key={topic}>
              <Checkbox
                checked={allowed[topic]}
                id={`${id}-${topic}`}
                onCheckedChange={(checked) =>
                  setAllowed((now) => ({ ...now, [topic]: checked === true }))
                }
              />
              <div className="grid gap-1">
                <Label htmlFor={`${id}-${topic}`}>{t(`${topic}.name`)}</Label>
                <p className="type-caption text-text-secondary">
                  {t(`${topic}.description`)}
                </p>
              </div>
            </div>
          ))}
          <Button onClick={() => save(allowed)} size="sm" variant="outline">
            {t("save")}
          </Button>
        </fieldset>
      ) : (
        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => save({ ads: true, analytics: true })}
              size="sm"
              variant="outline"
            >
              {asked.length > 1 ? t("allowAll") : t("allow")}
            </Button>
            <Button
              onClick={() => save({ ads: false, analytics: false })}
              size="sm"
              variant="outline"
            >
              {t("decline")}
            </Button>
          </div>
          {asked.length > 1 ? (
            <button
              className="type-caption justify-self-start underline underline-offset-4"
              onClick={() => setState("choose")}
              type="button"
            >
              {t("choose")}
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
};
