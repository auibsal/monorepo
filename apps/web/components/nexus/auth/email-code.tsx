"use client";

import { verifyEmailCode } from "@repo/auth/email";
import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { useAuthError } from "@/lib/nexus/auth-messages";

/**
 * The code from a sign-in or confirmation email, for when its link can't
 * be opened here: the email is on another device, the page is in an app's
 * own browser, or a mail scanner used the link first. A right code signs
 * the member in; the page's gate then sends them on.
 */
export const EmailCode = ({ email }: { email: string }) => {
  const t = useTranslations("auth");
  const errorText = useAuthError();
  const { supabase } = useAuth();
  const id = useId();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) {
      return;
    }
    setPending(true);
    setError(undefined);
    const result = await verifyEmailCode(supabase, email, code);
    setPending(false);
    if (!result.ok) {
      setError(errorText(result.code));
    }
  };

  return (
    <form className="grid gap-3" noValidate onSubmit={submit}>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-code`}>{t("code.label")}</Label>
        <Input
          aria-describedby={`${id}-code-hint`}
          autoComplete="one-time-code"
          className="max-w-48 tabular-nums tracking-widest"
          dir="ltr"
          id={`${id}-code`}
          inputMode="numeric"
          maxLength={12}
          onChange={(event) => setCode(event.target.value)}
          pattern="[0-9 ]*"
          value={code}
        />
        <p className="type-caption" id={`${id}-code-hint`}>
          {t("code.hint")}
        </p>
      </div>
      {error ? (
        <p className="text-text" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        className="justify-self-start"
        disabled={pending || code.trim().length < 6}
        type="submit"
      >
        {pending ? t("code.submitting") : t("code.submit")}
      </Button>
    </form>
  );
};
