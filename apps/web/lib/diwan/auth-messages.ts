"use client";

import { useTranslations } from "next-intl";
import type { EmailAuthErrorCode } from "@/lib/auth/email";
import type { PasskeyErrorCode } from "@/lib/auth/passkeys";

/** The translated text for an auth error code. */
export const useAuthError = () => {
  const t = useTranslations("auth.errors");
  return (code: EmailAuthErrorCode) => t(code);
};

/** The translated text for a passkey error code. */
export const usePasskeyError = () => {
  const t = useTranslations("auth.passkeyErrors");
  return (code: PasskeyErrorCode) => t(code);
};
