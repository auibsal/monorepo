"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { clientEnv as env } from "@/env.client";

/**
 * Cloudflare Turnstile, which Supabase Auth asks for on sign-up, sign-in
 * and password reset (Authentication → Attack Protection). Most people
 * never see a challenge; the widget only shows one when it is unsure.
 * Without a site key (local development) there is no check and no token.
 */

const SCRIPT =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface Turnstile {
  remove: (id: string) => void;
  render: (
    element: HTMLElement,
    options: {
      action?: string;
      callback: (token: string) => void;
      "error-callback": () => void;
      "expired-callback": () => void;
      language?: string;
      sitekey: string;
      theme?: "light" | "dark" | "auto";
    }
  ) => string;
  reset: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const siteKey = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

let loading: Promise<Turnstile> | null = null;

const loadTurnstile = () => {
  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }
  loading ??= new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.src = SCRIPT;
    script.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error("load"));
    script.onerror = () => {
      loading = null;
      reject(new Error("load"));
    };
    document.head.append(script);
  });
  return loading;
};

/**
 * The widget, the token it gave (single use) and `reset` for after each
 * request. `ready` is true when the request may go: always without a site
 * key, otherwise once a token is in.
 */
export const useHumanCheck = (action: string) => {
  const t = useTranslations("auth.humanCheck");
  const locale = useLocale();
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [token, setToken] = useState<string>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!(siteKey && container.current)) {
      return;
    }
    let cancelled = false;
    const element = container.current;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled) {
          return;
        }
        widget.current = turnstile.render(element, {
          action,
          callback: (value) => {
            setFailed(false);
            setToken(value);
          },
          "error-callback": () => {
            setToken(undefined);
            setFailed(true);
          },
          "expired-callback": () => setToken(undefined),
          language: locale,
          sitekey: siteKey,
          theme: "light",
        });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      if (widget.current) {
        window.turnstile?.remove(widget.current);
        widget.current = null;
      }
    };
  }, [action, locale]);

  // A token is good for one request: get a fresh one for the next.
  const reset = useCallback(() => {
    setToken(undefined);
    if (widget.current) {
      window.turnstile?.reset(widget.current);
    }
  }, []);

  const element = siteKey ? (
    <div className="grid gap-1">
      <div ref={container} />
      {failed ? (
        <p className="type-caption" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </div>
  ) : null;

  return { element, ready: !siteKey || Boolean(token), reset, token };
};
