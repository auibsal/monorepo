"use client";

import {
  CONSENT_SAVED,
  type ConsentPurpose,
  hasChoice,
  OPEN_CONSENT,
  saveChoice,
  siteChoices,
} from "@repo/analytics/consent";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Label } from "@repo/design-system/components/ui/label";
import { Link } from "@repo/internationalization/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

/** Which purposes the site asks about (what is switched on). */
export type ConsentPurposes = Record<ConsentPurpose, boolean>;

interface ConsentBannerProps {
  readonly purposes: ConsentPurposes;
}

type State = "hidden" | "first" | "choose";
type Topic = ConsentPurpose;

const topics = (purposes: ConsentPurposes) =>
  (["analytics", "ads"] as const).filter((topic) => purposes[topic]);

/**
 * The consent bar (v6): a slim bar along the bottom edge; the page ends
 * above it, so it never covers content. It asks until the visitor has answered for every purpose,
 * and again from "Cookie settings" in the footer. The answers are kept in the
 * site's own consent cookie, which the boot script passes on to Google
 * consent mode.
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
  const key = asked.join(",");

  useEffect(() => {
    const askedTopics = key.split(",").filter(Boolean) as Topic[];
    const allAnswered = () =>
      askedTopics.every((topic) => hasChoice(document.cookie, topic));
    if (askedTopics.length > 0 && !allAnswered()) {
      setState((now) => (now === "hidden" ? "first" : now));
    }
    const open = () => {
      opener.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      const choices = siteChoices(document.cookie);
      setAllowed({
        ads: choices.ads === true,
        analytics: choices.analytics === true,
      });
      setAnswered(allAnswered());
      setState("choose");
    };
    document.addEventListener(OPEN_CONSENT, open);
    return () => document.removeEventListener(OPEN_CONSENT, open);
  }, [key]);

  useEffect(() => {
    // The bar never covers the page: the page ends above it.
    const bar = card.current;
    if (state === "hidden" || !bar) {
      return;
    }
    const fit = () => {
      document.body.style.paddingBottom = `${bar.offsetHeight}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      document.body.style.paddingBottom = "";
    };
  }, [state]);

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
      Object.fromEntries(asked.map((topic) => [topic, choice[topic]])),
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
  const action =
    "font-medium text-[0.90625rem] underline decoration-1 underline-offset-4 hover:text-accent";

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="fixed inset-x-0 bottom-0 z-40 max-h-[70dvh] overflow-y-auto border-line border-t bg-surface text-text outline-none"
      ref={card}
      tabIndex={-1}
    >
      <div className="mx-auto grid w-full max-w-6xl gap-3 px-4 py-3 sm:px-6 lg:flex lg:items-center lg:gap-8">
        <p className="type-caption text-text lg:flex-1">
          <span className="font-medium" id={`${id}-title`}>
            {t("title")}.
          </span>{" "}
          {body}{" "}
          <Link className="underline underline-offset-4" href="/privacy">
            {t("privacy")}
          </Link>
        </p>
        {state === "choose" ? (
          <fieldset className="grid gap-3 lg:flex lg:items-center lg:gap-6">
            <legend className="sr-only">{t("choices")}</legend>
            {asked.map((topic) => (
              <div className="flex items-start gap-2" key={topic}>
                <Checkbox
                  checked={allowed[topic]}
                  id={`${id}-${topic}`}
                  onCheckedChange={(checked) =>
                    setAllowed((now) => ({ ...now, [topic]: checked === true }))
                  }
                />
                <Label
                  className="font-normal"
                  htmlFor={`${id}-${topic}`}
                  title={t(`${topic}.description`)}
                >
                  {t(`${topic}.name`)}
                </Label>
              </div>
            ))}
            <div className="flex items-center gap-5">
              <button
                className={action}
                onClick={() => save(allowed)}
                type="button"
              >
                {t("save")}
              </button>
              {answered ? (
                <button className={action} onClick={close} type="button">
                  {t("close")}
                </button>
              ) : null}
            </div>
          </fieldset>
        ) : (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <button
              className={action}
              onClick={() => save({ ads: true, analytics: true })}
              type="button"
            >
              {asked.length > 1 ? t("allowAll") : t("allow")}
            </button>
            <button
              className={action}
              onClick={() => save({ ads: false, analytics: false })}
              type="button"
            >
              {t("decline")}
            </button>
            {asked.length > 1 ? (
              <button
                className={action}
                onClick={() => setState("choose")}
                type="button"
              >
                {t("choose")}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
};
