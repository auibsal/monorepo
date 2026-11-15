"use client";

import { useRouter } from "@repo/internationalization/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { FullPageSpinner } from "@/components/diwan/states";
import { useAuth } from "@/lib/auth/provider";
import { rememberWays } from "@/lib/staff";

/**
 * Signing out (decisions.md, The site): ends the session on this device
 * only, then goes straight to the home page; no page in between. Other
 * devices stay signed in, listed in Settings.
 */
export const SignOut = () => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  useEffect(() => {
    supabase.auth
      .signOut({ scope: "local" })
      .catch(() => undefined)
      .finally(() => {
        rememberWays(null);
        queryClient.clear();
        router.replace("/");
      });
  }, [queryClient, router, supabase]);
  return <FullPageSpinner />;
};
