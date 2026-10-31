"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { Link, useRouter } from "@repo/internationalization/navigation";
import { unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { SignUpForm } from "@/components/nexus/auth/sign-up-form";
import { DiwanPage } from "@/components/nexus/page";
import { ErrorState, PageSpinner } from "@/components/nexus/states";

interface Invitation {
  email: string | null;
  kind: string;
  partner_name_ar: string | null;
  partner_name_en: string | null;
  usable: boolean;
}

/** Why accepting failed, as the database says it. */
const REASONS = [
  "one_membership",
  "invitation_for_another_address",
  "invitation_unusable",
  "team_full",
] as const;

const reasonOf = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return REASONS.find((reason) => message.includes(reason)) ?? "unknown";
};

/**
 * /invite/<code> (owner, Oct 31, 2026): an invitation to a partner's team,
 * or to be a guest of a partner or of the Society itself (Membership). Signed out, the visitor creates an account
 * here, whatever their address (the invitation is why it may be outside
 * AUIB); signed in, they accept it.
 */
export const Invite = ({ code }: { code: string }) => {
  const t = useTranslations("nexus.partnerInvite");
  const locale = useLocale() as Locale;
  const { loading, supabase, user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const invitation = useQuery({
    queryFn: async () =>
      ((unwrap(
        await supabase.schema("governance").rpc("partner_invitation", { code })
      ) ?? [])[0] ?? null) as Invitation | null,
    queryKey: ["partner-invitation", code],
  });
  const accept = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .rpc("accept_partner_invitation", { code })
      ),
    onSuccess: async (kind) => {
      await queryClient.invalidateQueries();
      router.replace(kind === "team" ? "/partners/dashboard" : "/membership");
    },
  });

  if (loading || invitation.isPending) {
    return <PageSpinner />;
  }
  if (invitation.isError) {
    return <ErrorState onRetry={() => invitation.refetch()} />;
  }
  const found = invitation.data;
  if (!found?.usable) {
    return (
      <DiwanPage lede={t("unusable")} narrow title={t("title")}>
        <Link className="link justify-self-start" href="/partners">
          {t("partners")}
        </Link>
      </DiwanPage>
    );
  }
  const partner =
    (locale === "ar" && found.partner_name_ar) || found.partner_name_en;
  const team = found.kind === "team";
  let lede = t("society");
  if (partner) {
    lede = team ? t("team", { partner }) : t("guest", { partner });
  }
  const path = `/invite/${code}`;

  if (!user) {
    return (
      <DiwanPage lede={lede} narrow title={t("title")}>
        <p className="type-body">{t("signUp")}</p>
        <div className="grid gap-6">
          <SignUpForm
            next={path}
            outside={{ email: found.email, reason: { invitation: code } }}
          />
        </div>
      </DiwanPage>
    );
  }

  return (
    <DiwanPage lede={lede} narrow title={t("title")}>
      {found.email && found.email !== user.email?.toLowerCase() ? (
        <p className="type-body">{t("otherAddress", { email: found.email })}</p>
      ) : (
        <div className="grid gap-4">
          <p className="type-body">
            {team ? t("acceptTeam") : t("acceptGuest")}
          </p>
          <Button
            className="justify-self-start"
            disabled={accept.isPending}
            onClick={() => accept.mutate()}
            type="button"
          >
            {t("accept")}
          </Button>
          {accept.isError ? (
            <p className="text-text" role="alert">
              {t(`errors.${reasonOf(accept.error)}`)}
            </p>
          ) : null}
        </div>
      )}
    </DiwanPage>
  );
};
