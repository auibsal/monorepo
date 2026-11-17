"use client";

import { Button } from "@repo/brand/components/ui/button";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { localized } from "@/lib/data";
import { queryKeys, useMyShifts } from "@/lib/diwan/queries";
import { RowList } from "../page";
import { Section } from "./section";

export const MyPrograms = () => {
  const t = useTranslations("diwan.home.programs");
  const locale = useLocale() as "en" | "ar";
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const shifts = useMyShifts();

  const update = useMutation({
    mutationFn: async ({
      shiftId,
      status,
    }: {
      shiftId: string;
      status: "confirmed" | "swap_requested";
    }) => {
      const { error } = await supabase
        .schema("api")
        .from("shift_signups")
        .update({ status })
        .eq("shift_id", shiftId)
        .eq("user_id", user?.id ?? "");
      if (error) {
        throw error;
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.shifts(user?.id ?? ""),
      }),
  });

  // On Today only when there is a shift (decisions.md, The site).
  if (!shifts.data?.length) {
    return null;
  }
  return (
    <Section id="programs" title={t("title")}>
      <RowList>
        {shifts.data?.map((signup) =>
          signup.shift ? (
            <li className="grid gap-1" key={signup.shift_id}>
              <p className="type-body font-medium">
                {localized(signup.shift, "role", locale)}
              </p>
              <p className="type-caption">
                {formatLongDate(signup.shift.starts_at, locale)} ·{" "}
                {formatClock(signup.shift.starts_at, locale)}
              </p>
              {signup.status === "signed_up" ? (
                <div className="flex gap-5">
                  <Button
                    onClick={() =>
                      update.mutate({
                        shiftId: signup.shift_id,
                        status: "confirmed",
                      })
                    }
                    size="sm"
                    variant="link"
                  >
                    {t("confirm")}
                  </Button>
                  <Button
                    onClick={() =>
                      update.mutate({
                        shiftId: signup.shift_id,
                        status: "swap_requested",
                      })
                    }
                    size="sm"
                    variant="outline"
                  >
                    {t("swap")}
                  </Button>
                </div>
              ) : null}
            </li>
          ) : null
        )}
      </RowList>
    </Section>
  );
};
