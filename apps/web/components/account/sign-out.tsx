"use client";

import { FormHeader } from "@repo/brand/components/sal/form-header";
import { Link } from "@repo/internationalization/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { rememberWays } from "@/lib/staff";

/** Ends the session on this device (only this one) and says so. */
export const SignOut = () => {
  const t = useTranslations("auth.signedOut");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [done, setDone] = useState(false);
  useEffect(() => {
    let live = true;
    supabase.auth
      .signOut({ scope: "local" })
      .catch(() => undefined)
      .finally(() => {
        rememberWays(null);
        queryClient.clear();
        if (live) {
          setDone(true);
        }
      });
    return () => {
      live = false;
    };
  }, [queryClient, supabase]);
  return (
    <div className="mx-auto grid w-full max-w-md gap-6 px-4 py-16">
      <FormHeader title={t("title")}>
        {done ? t("body") : t("pending")}
      </FormHeader>
      {done ? (
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <Link className="link" href="/">
            {t("home")}
          </Link>
          <Link className="link" href="/sign-in">
            {t("signIn")}
          </Link>
        </div>
      ) : null}
    </div>
  );
};
