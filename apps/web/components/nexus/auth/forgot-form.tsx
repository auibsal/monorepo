"use client";

import { sendPasswordReset } from "@repo/auth/email";
import { useAuth } from "@repo/auth/provider";
import { FormHeader } from "@repo/design-system/components/sal/form-header";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { localizedPath } from "@repo/internationalization";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useRef, useState } from "react";
import { useAuthError } from "@/lib/nexus/auth-messages";
import { callbackUrl } from "@/lib/nexus/navigation";
import { useHumanCheck } from "./human-check";

export const ForgotForm = () => {
  const t = useTranslations("auth");
  const errorText = useAuthError();
  const { supabase } = useAuth();
  const locale = useLocale();
  const id = useId();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  // Each request replaces the link before it and the PKCE verifier in this
  // browser, so a second click while the first is sending would leave the
  // emailed link unusable. The ref blocks it before React re-renders.
  const inFlight = useRef<boolean>(false);
  const human = useHumanCheck("reset");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError(undefined);
    const result = await sendPasswordReset(
      supabase,
      email,
      callbackUrl(locale, localizedPath(locale, "/auth/reset")),
      human.token
    );
    inFlight.current = false;
    human.reset();
    setPending(false);
    if (result.ok) {
      setSent(true);
    } else {
      setError(errorText(result.code));
    }
  };

  return (
    <>
      <FormHeader title={t("forgot.title")}>
        {t("forgot.description")}
      </FormHeader>
      {sent ? (
        <p role="status">{t("forgot.sent", { email })}</p>
      ) : (
        <form className="grid gap-4" noValidate onSubmit={submit}>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-email`}>{t("email")}</Label>
            <Input
              autoComplete="email"
              dir="ltr"
              id={`${id}-email`}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </div>
          {human.element}
          {error ? (
            <p className="text-text" role="alert">
              {error}
            </p>
          ) : null}
          <Button disabled={pending || !human.ready} type="submit">
            {pending ? t("forgot.sending") : t("forgot.submit")}
          </Button>
        </form>
      )}
    </>
  );
};
