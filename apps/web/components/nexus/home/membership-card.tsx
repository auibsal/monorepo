"use client";

import { useAuth } from "@repo/auth/provider";
import { BrandLogo } from "@repo/design-system/components/brand-logo";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { siteUrl } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { membership } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import QRCode from "react-qr-code";
import { useMemberStatus, useProfile } from "@/lib/nexus/queries";

const cardKey = ["membership", "card"] as const;

/** The card number as printed: four digits at least (No. 0042). */
const cardNumber = (value: number) => String(value).padStart(4, "0");

/** The month and year a member joined, for the card's face. */
const sinceMonth = (date: string, locale: string) =>
  new Intl.DateTimeFormat(locale === "ar" ? "ar-IQ-u-nu-latn" : "en-US", {
    month: "long",
    timeZone: "Asia/Baghdad",
    year: "numeric",
  }).format(new Date(date));

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="grid content-start gap-1">
    <dt className="type-label text-text-secondary">{label}</dt>
    <dd className="font-medium text-text tabular-nums">{value}</dd>
  </div>
);

/**
 * The membership card: paper, the lockup, the member's name and a QR that
 * links to auibsal.org/verify/member/<code>. Any phone camera opens the
 * check; officers at the door scan the same code to check members in. The
 * card is an object, like a certificate: it keeps the light theme.
 */
export const MembershipCard = () => {
  const t = useTranslations("nexus.home");
  const locale = useLocale() as "en" | "ar";
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const status = useMemberStatus();
  const profile = useProfile();
  const card = useQuery({
    enabled: Boolean(user && status.data?.is_member),
    queryFn: () => membership.myCard(supabase),
    queryKey: [...cardKey, user?.id],
  });
  const reissue = useMutation({
    mutationFn: () => membership.reissueCard(supabase),
    onSuccess: (fresh) =>
      queryClient.setQueryData([...cardKey, user?.id], fresh),
  });

  if (!(status.data?.is_member && profile.data && card.data)) {
    return null;
  }

  const name =
    (locale === "ar" && profile.data.full_name_ar) || profile.data.full_name_en;
  const link = siteUrl(locale, membership.cardPath(card.data.code));
  const tier = status.data.tier ? t(`tiers.${status.data.tier}`) : "";

  return (
    <section aria-labelledby="membership-card" className="grid gap-4">
      <h2 className="sr-only" id="membership-card">
        {t("card.title")}
      </h2>
      <div
        className="relative grid max-w-3xl gap-8 border border-line bg-surface-reading p-6 text-text sm:grid-cols-[1fr_auto] sm:p-8"
        data-theme="light"
      >
        <div className="grid content-between gap-8">
          <div className="flex items-start justify-between gap-4">
            <BrandLogo ground="light" height={44} locale={locale} />
            <p className="type-label pt-1 text-end text-text-secondary">
              {t("card.title")}
            </p>
          </div>
          <p className="type-display text-balance" dir="auto">
            {name}
          </p>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 border-line border-t pt-4 sm:grid-cols-4">
            <Field
              label={t("card.numberLabel")}
              value={cardNumber(card.data.number)}
            />
            {status.data.member_since ? (
              <Field
                label={t("card.since")}
                value={sinceMonth(status.data.member_since, locale)}
              />
            ) : null}
            {tier ? <Field label={t("card.tier")} value={tier} /> : null}
            <Field
              label={t("card.vote")}
              value={
                status.data.voting_member ? t("card.votes") : t("card.noVote")
              }
            />
          </dl>
        </div>
        <figure className="grid content-start justify-items-center gap-2 sm:border-line sm:border-s sm:ps-8">
          <a
            aria-label={t("card.checkLink")}
            className="bg-surface p-3"
            href={link}
          >
            <QRCode aria-hidden="true" size={148} value={link} />
          </a>
          <figcaption className="type-caption max-w-44 text-center">
            {t("card.qr")}
          </figcaption>
        </figure>
        {/* The one accent on the card: a crimson rule along its foot. */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-1.5 bg-accent"
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button className="px-0" variant="link">
              {t("card.show")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" data-theme="light">
            <DialogHeader>
              <DialogTitle>{name}</DialogTitle>
              <DialogDescription>{t("card.showHint")}</DialogDescription>
            </DialogHeader>
            <div className="grid justify-items-center gap-3 bg-surface p-6">
              <QRCode
                aria-label={t("card.checkLink")}
                className="h-auto w-full max-w-72"
                size={288}
                value={link}
              />
              <p className="type-label text-text-secondary">
                {t("card.number", { number: cardNumber(card.data.number) })}
              </p>
            </div>
          </DialogContent>
        </Dialog>
        <a className="link type-caption" href={link}>
          {t("card.open")}
        </a>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="px-0 text-text-secondary" variant="link">
              {t("card.reissue")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("card.reissueTitle")}</DialogTitle>
              <DialogDescription>{t("card.reissueBody")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                disabled={reissue.isPending}
                onClick={() => reissue.mutate()}
              >
                {t("card.reissueConfirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {reissue.isSuccess ? (
          <p className="type-caption" role="status">
            {t("card.reissued")}
          </p>
        ) : null}
      </div>
      {card.data.issued_at ? (
        <p className="type-caption">
          {t("card.issued", {
            date: formatLongDate(card.data.issued_at, locale, true),
          })}
        </p>
      ) : null}
    </section>
  );
};
