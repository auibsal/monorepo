"use client";

import { useAuth } from "@repo/auth/provider";
import { SalCard } from "@repo/design-system/components/sal/card";
import { FormHeader } from "@repo/design-system/components/sal/form-header";
import { Button } from "@repo/design-system/components/ui/button";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { Link } from "@repo/internationalization/navigation";
import { localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { queryKeys, useVerificationRequest } from "@/lib/nexus/queries";
import { Affiliations } from "./profile/affiliations";

/** Shown to accounts on non-AUIB addresses until a verifier approves them. */
export const PendingVerification = () => {
  const t = useTranslations("nexus.pending");
  const tc = useTranslations("common");
  const { supabase, user } = useAuth();
  const request = useVerificationRequest();
  const queryClient = useQueryClient();
  const id = useId();
  const [statement, setStatement] = useState<string | undefined>(undefined);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .schema("membership")
        .from("verification_requests")
        .update({ statement: statement?.trim() ?? "" })
        .eq("id", request.data?.id ?? "");
      if (error) {
        throw error;
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.verification(user?.id ?? ""),
      }),
  });

  return (
    <main className="mx-auto grid w-full max-w-xl gap-6 px-4 py-12" id="main">
      <FormHeader title={t("title")}>{t("body")}</FormHeader>
      {request.data?.status === "pending" ? (
        <SalCard>
          <Label htmlFor={id}>{t("statement")}</Label>
          <Textarea
            defaultValue={request.data.statement ?? ""}
            id={id}
            maxLength={1000}
            onChange={(event) => setStatement(event.target.value)}
            rows={4}
          />
          <Button
            className="justify-self-start"
            disabled={save.isPending || statement === undefined}
            onClick={() => save.mutate()}
            variant="outline"
          >
            {save.isSuccess ? tc("saved") : t("editStatement")}
          </Button>
        </SalCard>
      ) : null}
      <Affiliations />
    </main>
  );
};

/**
 * For people verified as a partner's members: what they can use in the
 * Nexus (the Journal calls opened to their partner, their profile and
 * service). The rest is for Society members.
 */
export const PartnerGuest = () => {
  const t = useTranslations("nexus.partnerGuest");
  const locale = useLocale();
  const { supabase } = useAuth();
  // "Guest of …": a guest sees only the partners they are verified with.
  const partnerNames = useQuery({
    queryFn: async () =>
      unwrap(await supabase.schema("governance").rpc("partner_names")) ?? [],
    queryKey: ["partner-names", "guest"],
  });
  const names = (partnerNames.data ?? [])
    .map((p) => localized(p, "name", locale))
    .join(", ");
  const links = [
    ["/qirtas/write", t("journal")],
    ["/membership/profile", t("profile")],
    ["/membership/service", t("service")],
    ["/membership/settings", t("settings")],
  ] as const;
  return (
    <main className="mx-auto grid w-full max-w-xl gap-6 px-4 py-12" id="main">
      <FormHeader title={names ? t("guestOf", { partner: names }) : t("title")}>
        {t("body")}
      </FormHeader>
      <ul className="grid gap-2">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link className="link" href={href}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
};
