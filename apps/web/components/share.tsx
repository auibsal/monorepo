"use client";

import { Icon } from "@repo/brand/components/sal/icon";
import { useTranslations } from "next-intl";
import { useState } from "react";

type State = "idle" | "copied" | "failed";

/**
 * Share this page (decisions.md; design review A4): the device's own
 * share sheet where there is one, otherwise the link is copied. A text
 * link with the share icon; the outcome is said aloud for screen readers.
 * Nothing is sent anywhere by the Society.
 */
export const ShareLink = ({
  href,
  label,
  text,
  title,
}: {
  /** The page to share, a localized path; this page by default. */
  readonly href?: string;
  /** The link's words; "Share" by default. */
  readonly label?: string;
  /** Plain text to share with the link (a game's result). */
  readonly text?: string;
  readonly title: string;
}) => {
  const t = useTranslations("common.share");
  const [state, setState] = useState<State>("idle");

  const share = async () => {
    const url = href
      ? new URL(href, window.location.origin).href
      : window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text, title, url });
        return;
      } catch (error) {
        // Closing the share sheet is not a failure.
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }
    try {
      await navigator.clipboard.writeText(text ? `${text}\n${url}` : url);
      setState("copied");
    } catch {
      setState("failed");
    }
  };

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-3 gap-y-1 print:hidden">
      <button
        className="inline-flex items-center gap-1.5 text-text underline decoration-1 underline-offset-4 transition-colors duration-quick ease-standard hover:text-accent"
        onClick={share}
        type="button"
      >
        <Icon name="share-2" />
        {label ?? t("share")}
      </button>
      <span aria-live="polite" className="type-caption text-text-secondary">
        {state === "idle" ? "" : t(state)}
      </span>
    </span>
  );
};
