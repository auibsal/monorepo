"use client";

import { MIN_PASSWORD_LENGTH, toEmailAuthError } from "@repo/auth/email";
import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { PasswordInput } from "@/components/fields/password-input";
import { useAuthError } from "@/lib/diwan/auth-messages";
import { isBreachedPassword } from "@/lib/password";
import { DiwanSection } from "../page";

/**
 * Change the password from Settings, signed in: no recovery email needed.
 * The sign-in address itself is the AUIB address (or the partner's), and
 * stays; the personal email is what follows a member after graduation.
 * Supabase asks for a fresh confirmation when the sign-in is old (secure
 * password change, decisions §11): a code goes to the sign-in address and
 * the change goes through with it.
 */
export const ChangePassword = () => {
  const t = useTranslations("diwan.settings.password");
  const ta = useTranslations("auth");
  const errorText = useAuthError();
  const { supabase } = useAuth();
  const id = useId();
  const [password, setPassword] = useState("");
  const [nonce, setNonce] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string>();

  const change = async () => {
    const { error: updateError } = await supabase.auth.updateUser(
      nonce ? { nonce: nonce.trim(), password } : { password }
    );
    if (!updateError) {
      setPassword("");
      setNonce(null);
      setState("done");
      return;
    }
    const code = toEmailAuthError(updateError);
    if (code === "reauthentication_needed" && nonce === null) {
      // A code to the sign-in address; the form asks for it.
      await supabase.auth.reauthenticate();
      setNonce("");
    }
    setState("idle");
    setError(errorText(code));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(undefined);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(errorText("weak_password"));
      return;
    }
    setState("busy");
    if (await isBreachedPassword(password)) {
      setState("idle");
      setError(errorText("breached_password"));
      return;
    }
    await change();
  };

  return (
    <DiwanSection id="password" title={t("title")}>
      <form className="grid max-w-sm gap-4" onSubmit={submit}>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-password`}>{t("new")}</Label>
          <PasswordInput
            aria-describedby={`${id}-hint`}
            autoComplete="new-password"
            id={`${id}-password`}
            onChange={(event) => {
              setPassword(event.target.value);
              setState("idle");
            }}
            value={password}
          />
          <p className="type-caption" id={`${id}-hint`}>
            {ta("passwordHint")}
          </p>
        </div>
        {nonce === null ? null : (
          <div className="grid gap-2">
            <Label htmlFor={`${id}-nonce`}>{t("code")}</Label>
            <Input
              autoComplete="one-time-code"
              dir="ltr"
              id={`${id}-nonce`}
              inputMode="numeric"
              onChange={(event) => setNonce(event.target.value)}
              value={nonce}
            />
          </div>
        )}
        {error ? (
          <p className="text-text" role="alert">
            {error}
          </p>
        ) : null}
        {state === "done" ? <p role="status">{t("done")}</p> : null}
        <Button
          className="justify-self-start"
          disabled={state === "busy" || password.length === 0 || nonce === ""}
          size="sm"
          type="submit"
          variant="outline"
        >
          {t("submit")}
        </Button>
      </form>
    </DiwanSection>
  );
};
