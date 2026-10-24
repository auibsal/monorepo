"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { useRouter } from "@repo/internationalization/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { callApi } from "@/lib/nexus/api";
import { DiwanSection } from "../page";

const normalize = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

/** True when the typed text matches the confirmation phrase. */
export const matchesConfirmation = (typed: string, phrase: string) =>
  normalize(typed) === normalize(phrase);

/** Account deletion, through the API routes (it needs the admin API). */
export const DeleteAccount = () => {
  const t = useTranslations("nexus.profile.delete");
  const { supabase } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = useId();
  const [typed, setTyped] = useState("");
  const phrase = t("phrase");

  const remove = useMutation({
    mutationFn: () => callApi(supabase, "/account/delete", {}),
    onSuccess: async () => {
      await supabase.auth.signOut({ scope: "local" });
      queryClient.clear();
      router.replace({ pathname: "/sign-in", query: { deleted: "1" } });
    },
  });

  return (
    <DiwanSection
      description={t("description")}
      id="delete-account"
      title={t("title")}
    >
      <Dialog>
        <DialogTrigger asChild>
          <Button className="justify-self-start" variant="outline">
            {t("submit")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <Label htmlFor={id}>{t("prompt", { phrase })}</Label>
          <Input
            autoComplete="off"
            id={id}
            onChange={(e) => setTyped(e.target.value)}
            value={typed}
          />
          {remove.isError ? (
            <p className="text-text" role="alert">
              {t("failed")}
            </p>
          ) : null}
          <Button
            disabled={!matchesConfirmation(typed, phrase) || remove.isPending}
            onClick={() => remove.mutate()}
          >
            {remove.isPending ? t("deleting") : t("submit")}
          </Button>
        </DialogContent>
      </Dialog>
    </DiwanSection>
  );
};
