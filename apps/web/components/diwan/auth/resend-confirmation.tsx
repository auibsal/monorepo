"use client";

import { resendConfirmation } from "@repo/auth/email";
import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useAuthError } from "@/lib/diwan/auth-messages";

/** Seconds before the confirmation email may be sent again. */
export const RESEND_WAIT = 60;

/**
 * "Send it again" on the check-your-inbox screen, available after a
 * minute and then a minute after each send, so a lost email can be
 * replaced without signing up twice.
 */
export const ResendConfirmation = ({
  email,
  redirectTo,
}: {
  email: string;
  redirectTo?: string;
}) => {
  const t = useTranslations("auth.signUp");
  const errorText = useAuthError();
  const { supabase } = useAuth();
  const [wait, setWait] = useState(RESEND_WAIT);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    if (wait <= 0) {
      return;
    }
    const timer = setTimeout(() => setWait((left) => left - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const send = async () => {
    setPending(true);
    setMessage(undefined);
    const result = await resendConfirmation(supabase, email, redirectTo);
    setPending(false);
    setMessage(result.ok ? t("resent") : errorText(result.code));
    setWait(RESEND_WAIT);
  };

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={wait > 0 || pending}
          onClick={send}
          type="button"
          variant="link"
        >
          {wait > 0 ? t("resendIn", { seconds: String(wait) }) : t("resend")}
        </Button>
      </div>
      {message ? (
        <p className="type-caption" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
};
