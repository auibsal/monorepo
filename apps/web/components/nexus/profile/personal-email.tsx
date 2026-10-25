"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { formatLongDate } from "@repo/internationalization/format";
import { membership } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";

const key = ["personal-email"] as const;

/**
 * The personal email, for after graduation: optional, used only once the
 * member has confirmed it from the link sent to it, and never an address
 * that is already someone's (a sign-in address, or another member's
 * personal email). The database checks; this shows the state and the
 * reason when an address is refused.
 */
export const PersonalEmail = () => {
  const t = useTranslations("nexus.personalEmail");
  const locale = useLocale();
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const id = useId();
  const [address, setAddress] = useState("");
  const current = useQuery({
    enabled: Boolean(user),
    queryFn: () => membership.myPersonalEmail(supabase),
    queryKey: [...key, user?.id],
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const request = useMutation({
    mutationFn: (email: string) =>
      membership.requestPersonalEmail(supabase, email),
    onSuccess: async () => {
      setAddress("");
      await refresh();
    },
  });
  const remove = useMutation({
    mutationFn: () => membership.removePersonalEmail(supabase),
    onSuccess: refresh,
  });

  const { data } = current;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (address.trim()) {
      request.mutate(address);
    }
  };

  return (
    <div className="grid gap-4">
      <p className="type-caption">{t("why")}</p>
      {data?.email ? (
        <div className="grid gap-1">
          <p className="font-medium" dir="ltr">
            {data.email}
          </p>
          <p className="type-caption" role="status">
            {data.verified ? t("verified") : t("unverified")}
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {data.verified ? null : (
              <Button
                className="px-0"
                disabled={request.isPending}
                onClick={() => data.email && request.mutate(data.email)}
                variant="link"
              >
                {t("sendLink")}
              </Button>
            )}
            <Button
              className="px-0 text-text-secondary"
              disabled={remove.isPending}
              onClick={() => remove.mutate()}
              variant="link"
            >
              {t("remove")}
            </Button>
          </div>
        </div>
      ) : null}
      {data?.pending_email ? (
        <p className="type-body" role="status">
          {t("pending", {
            date: data.pending_since
              ? formatLongDate(data.pending_since, locale)
              : "",
            email: data.pending_email,
          })}
        </p>
      ) : null}
      <form className="grid gap-2" onSubmit={submit}>
        <Label htmlFor={`${id}-email`}>
          {data?.email ? t("change") : t("label")}
        </Label>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            autoComplete="email"
            className="max-w-sm"
            dir="ltr"
            id={`${id}-email`}
            inputMode="email"
            onChange={(e) => {
              request.reset();
              setAddress(e.target.value);
            }}
            type="email"
            value={address}
          />
          <Button
            disabled={request.isPending || !address.trim()}
            type="submit"
            variant="outline"
          >
            {t("sendLink")}
          </Button>
        </div>
        {request.isError ? (
          <p className="text-text" role="alert">
            {t(`errors.${membership.personalEmailError(request.error)}`)}
          </p>
        ) : null}
        {request.isSuccess ? (
          <p className="type-caption" role="status">
            {t("sent")}
          </p>
        ) : null}
      </form>
    </div>
  );
};
