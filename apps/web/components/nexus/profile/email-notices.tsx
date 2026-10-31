"use client";

import { useAuth } from "@repo/auth/provider";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Label } from "@repo/design-system/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { queryKeys, useProfile } from "@/lib/nexus/queries";
import { ErrorLine } from "../admin/kit";

/**
 * "Email me about events, calls and Society notices" (owner, Oct 31, 2026:
 * kept on Notices only): the optional emails, the Sunday Paper and booked
 * event reminders. Saved as soon as it is ticked.
 */
export const EmailNotices = () => {
  const t = useTranslations("nexus");
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const profile = useProfile();
  const id = useId();
  const save = useMutation({
    mutationFn: async (on: boolean) => {
      const { error } = await supabase
        .schema("core")
        .from("profiles")
        .update({ notify_email: on })
        .eq("id", user?.id ?? "");
      if (error) {
        throw error;
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile(user?.id ?? ""),
      }),
  });
  if (!profile.data) {
    return null;
  }
  const checked = save.isPending
    ? Boolean(save.variables)
    : profile.data.notify_email;
  return (
    <div className="grid gap-2">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={checked}
          disabled={save.isPending}
          id={id}
          onCheckedChange={(v) => save.mutate(v === true)}
        />
        <Label className="leading-normal" htmlFor={id}>
          {t("setup.notifications")}
        </Label>
      </div>
      <ErrorLine error={save.error} />
    </div>
  );
};
