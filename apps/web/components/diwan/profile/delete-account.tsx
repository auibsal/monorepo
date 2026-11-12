"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import { useRouter } from "@repo/internationalization/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { ApiError, callApi } from "@/lib/diwan/api";
import { DiwanSection } from "../page";

const normalize = (value: string) =>
  value.trim().replace(/\s+/gu, " ").toLowerCase();

/** True when the typed text matches the confirmation phrase. */
export const matchesConfirmation = (typed: string, phrase: string) =>
  normalize(typed) === normalize(phrase);

/**
 * Deleting the account (decisions.md, Members), through the API routes:
 * it is deleted 30 days later, and signing in before then restores it.
 * The confirmation is a second step on the page, never a pop-up.
 */
export const DeleteAccount = () => {
  const t = useTranslations("diwan.profile.delete");
  const { supabase } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = useId();
  const [typed, setTyped] = useState("");
  const [confirming, setConfirming] = useState(false);
  const phrase = t("phrase");

  const remove = useMutation({
    mutationFn: () =>
      callApi<{ deletesOn: string }>(supabase, "/account/delete", {}),
    onSuccess: async ({ deletesOn }) => {
      // Every device signs out; signing in again restores the account.
      await supabase.auth.signOut({ scope: "global" });
      queryClient.clear();
      router.replace({
        pathname: "/sign-in",
        query: { deleted: deletesOn.slice(0, 10) },
      });
    },
  });

  const stale =
    remove.error instanceof ApiError && remove.error.code === "reauthenticate";

  return (
    <DiwanSection
      description={t("description")}
      id="delete-account"
      title={t("title")}
    >
      {confirming ? (
        <div className="border-line grid max-w-xl gap-3 border-t pt-4">
          <Label htmlFor={id}>{t("prompt", { phrase })}</Label>
          <Input
            autoComplete="off"
            id={id}
            onChange={(e) => setTyped(e.target.value)}
            value={typed}
          />
          {remove.isError ? (
            <p className="text-text" role="alert">
              {stale ? (
                <>
                  {t("reauthenticate")}{" "}
                  <button
                    className="link"
                    onClick={async () => {
                      // A fresh sign-in, then back here.
                      await supabase.auth.signOut({ scope: "local" });
                      queryClient.clear();
                      router.replace({
                        pathname: "/sign-in",
                        query: { next: "/account/settings" },
                      });
                    }}
                    type="button"
                  >
                    {t("signInAgain")}
                  </button>
                </>
              ) : (
                t("failed")
              )}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button
              onClick={() => {
                setConfirming(false);
                setTyped("");
              }}
              type="button"
              variant="link"
            >
              {t("cancel")}
            </Button>
            <Button
              disabled={!matchesConfirmation(typed, phrase) || remove.isPending}
              onClick={() => remove.mutate()}
            >
              {remove.isPending ? t("deleting") : t("submit")}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          className="justify-self-start"
          onClick={() => setConfirming(true)}
          variant="outline"
        >
          {t("submit")}
        </Button>
      )}
    </DiwanSection>
  );
};
