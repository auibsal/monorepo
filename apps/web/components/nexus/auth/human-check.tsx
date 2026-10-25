"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { clientEnv as env } from "@/env.client";

/**
 * Cloudflare Turnstile, which Supabase Auth asks for on sign-up, sign-in
 * and password reset (Authentication → Attack Protection). Most people
 * never see a challenge; the widget only shows one when it is unsure.
 * Without a site key (local development) there is no check and no token.
 *
 * The form's button waits for the check, so the check must never hang
 * silently: Turnstile retries on its own, and if no pass arrives within
 * SLOW_MS, or the check fails, the member is told so, with "Try again",
 * the error code (to report) and, inside apps' own browsers where the
 * check often can't finish, the advice to open the page in a browser.
 */

const SCRIPT =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** How long before a check that hasn't finished is called slow. */
const SLOW_MS = 12_000;

/** Browsers built into apps, where the check most often stalls. */
const IN_APP =
  /Instagram|FBAN|FBAV|FB_IAB|Snapchat|TikTok|musical_ly|Line\/|Twitter|LinkedInApp|Telegram|; wv\)/i;

interface Turnstile {
  remove: (id: string) => void;
  render: (
    element: HTMLElement,
    options: {
      action?: string;
      callback: (token: string) => void;
      "error-callback": (code?: string) => boolean | undefined;
      "expired-callback": () => void;
      language?: string;
      "refresh-expired"?: "auto" | "manual" | "never";
      "refresh-timeout"?: "auto" | "manual" | "never";
      retry?: "auto" | "never";
      "retry-interval"?: number;
      sitekey: string;
      theme?: "light" | "dark" | "auto";
      "timeout-callback"?: () => void;
      "unsupported-callback"?: () => void;
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

type Problem = { kind: "failed" | "slow"; code?: string } | null;

/**
 * The widget, the token it gave (single use) and `reset` for after each
 * request. `ready` is true when the request may go: always without a site
 * key, otherwise once a token is in; `checking` while the check runs.
 */
export const useHumanCheck = (action: string) => {
  const t = useTranslations("auth.humanCheck");
  const locale = useLocale();
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [token, setToken] = useState<string>();
  const [problem, setProblem] = useState<Problem>(null);
  const [inApp, setInApp] = useState(false);

  useEffect(() => setInApp(IN_APP.test(navigator.userAgent)), []);

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
            setProblem(null);
            setToken(value);
          },
          "error-callback": (code) => {
            setToken(undefined);
            setProblem({ code, kind: "failed" });
            // Let Turnstile retry by itself as well.
            return false;
          },
          "expired-callback": () => setToken(undefined),
          language: locale,
          "refresh-expired": "auto",
          "refresh-timeout": "auto",
          retry: "auto",
          "retry-interval": 4000,
          sitekey: siteKey,
          theme: "light",
          "timeout-callback": () => setProblem({ kind: "slow" }),
          "unsupported-callback": () =>
            setProblem({ code: "unsupported", kind: "failed" }),
        });
      })
      .catch(() => setProblem({ code: "script", kind: "failed" }));
    return () => {
      cancelled = true;
      if (widget.current) {
        window.turnstile?.remove(widget.current);
        widget.current = null;
      }
    };
  }, [action, locale]);

  // No pass after a while: say so, rather than leave a spinner. Try again
  // clears the problem, which starts the clock again.
  useEffect(() => {
    if (!siteKey || token || problem) {
      return;
    }
    const timer = window.setTimeout(
      () => setProblem({ kind: "slow" }),
      SLOW_MS
    );
    return () => window.clearTimeout(timer);
  }, [token, problem]);

  // A token is good for one request: get a fresh one for the next.
  const reset = useCallback(() => {
    setToken(undefined);
    if (widget.current) {
      window.turnstile?.reset(widget.current);
    }
  }, []);

  const retry = () => {
    setProblem(null);
    if (widget.current) {
      reset();
    } else {
      // The script never loaded: load it again.
      window.location.reload();
    }
  };

  const element = siteKey ? (
    <div className="grid gap-2">
      <div ref={container} />
      {problem ? (
        <div className="grid gap-1" role="alert">
          <p className="type-caption">
            {t(problem.kind)}
            {problem.code ? ` ${t("code", { code: problem.code })}` : ""}
          </p>
          {inApp ? <p className="type-caption">{t("inApp")}</p> : null}
          <Button
            className="justify-self-start px-0"
            onClick={retry}
            type="button"
            variant="link"
          >
            {t("retry")}
          </Button>
        </div>
      ) : null}
    </div>
  ) : null;

  const checking = Boolean(siteKey) && !token;

  /** The form button's text: busy, waiting for the check, or ready. */
  const label = (pending: boolean, ready: string, busy: string) => {
    if (pending) {
      return busy;
    }
    return checking ? t("checking") : ready;
  };

  return {
    checking,
    element,
    label,
    ready: !siteKey || Boolean(token),
    reset,
    token,
  };
};
