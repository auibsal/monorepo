"use client";

import { usePathname, useRouter } from "@repo/internationalization/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth/provider";

/**
 * How long the Diwan stays signed in with nobody using it: NIST SP
 * 800-63B-4's inactivity timeout for two-step (AAL2) sessions.
 */
export const IDLE_MINUTES = 60;

const KEY = "sal_diwan_active_at";
const EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

const readStamp = () => {
  try {
    return Number(window.localStorage.getItem(KEY)) || Date.now();
  } catch {
    return Date.now();
  }
};

const writeStamp = (value: number) => {
  try {
    window.localStorage.setItem(KEY, String(value));
  } catch {
    // Private windows may refuse storage; this tab still keeps its own time.
  }
};

/** Whether the last use was longer ago than the limit. */
export const isIdle = (lastActive: number, now: number, minutes: number) =>
  now - lastActive > minutes * 60_000;

/**
 * Marks this device as in use while the member uses your account or the
 * Diwan, in any tab (the time is shared through local storage), so the
 * Diwan's timeout counts use anywhere on the signed-in site.
 */
export const ActivityStamp = () => {
  useEffect(() => {
    let lastWrite = 0;
    const touch = () => {
      const now = Date.now();
      // At most every few seconds: a busy page shouldn't write constantly.
      if (now - lastWrite > 5000) {
        lastWrite = now;
        writeStamp(now);
      }
    };
    touch();
    for (const name of EVENTS) {
      window.addEventListener(name, touch, { passive: true });
    }
    return () => {
      for (const name of EVENTS) {
        window.removeEventListener(name, touch);
      }
    };
  }, []);
  return null;
};

/**
 * The Diwan's inactivity timeout (NIST SP 800-63B-4, AAL2): after an hour with no use
 * of your account or the Diwan in any tab, this device signs out and comes
 * back to the sign-in page, which returns to the same page afterwards.
 * Opening the Diwan counts as use, so a session that was idle elsewhere is
 * never signed out on arrival.
 */
export const IdleSignOut = () => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    writeStamp(Date.now());
    const timer = window.setInterval(async () => {
      if (!isIdle(readStamp(), Date.now(), IDLE_MINUTES)) {
        return;
      }
      window.clearInterval(timer);
      await supabase.auth.signOut({ scope: "local" });
      queryClient.clear();
      router.replace({
        pathname: "/sign-in",
        query: { idle: "1", next: pathname },
      });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [pathname, queryClient, router, supabase]);

  return null;
};
