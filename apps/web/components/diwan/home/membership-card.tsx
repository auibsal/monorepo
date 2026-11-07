"use client";

import { useAuth } from "@repo/auth/provider";
import {
  MembershipCard as CardFace,
  cardNumber,
} from "@repo/brand/components/sal/membership-card";
import { Button } from "@repo/brand/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/brand/components/ui/dialog";
import { siteUrl } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { membership, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { callApi } from "@/lib/diwan/api";
import {
  useMemberStatus,
  useMyMembership,
  useProfile,
} from "@/lib/diwan/queries";
import {
  TOTP_PERIOD_SECONDS,
  totp,
  totpSecondsLeft,
  totpStep,
} from "@/lib/totp";

const cardKey = ["membership", "card"] as const;

/** The month and year a member joined, for the card's face. */
const sinceMonth = (date: string, locale: string) =>
  new Intl.DateTimeFormat(locale === "ar" ? "ar-IQ-u-nu-latn" : "en-US", {
    month: "long",
    timeZone: "Asia/Baghdad",
    year: "numeric",
  }).format(new Date(date));

/**
 * The live code: new digits every 30 seconds from the card's secret, and
 * the time, ticking. A screenshot freezes both, so it shows at a glance and
 * stops working at the door within a minute.
 */
const useLiveCode = (secret: string | undefined) => {
  const [now, setNow] = useState(() => Date.now());
  const [digits, setDigits] = useState<string | null>(null);
  const step = totpStep(now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!secret) {
      return;
    }
    let current = true;
    totp(secret, step).then((value) => {
      if (current) {
        setDigits(value);
      }
    });
    return () => {
      current = false;
    };
  }, [secret, step]);
  return { digits, now, secondsLeft: totpSecondsLeft(now) };
};

/**
 * Add to Google Wallet: the pass carries the same live code. Once Google
 * says the member saved it, the card says so instead.
 */
const WalletLink = ({ code }: { code: string }) => {
  const t = useTranslations("diwan.home.card");
  const { supabase } = useAuth();
  const [state, setState] = useState<"idle" | "busy" | "unavailable">("idle");
  const pass = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("membership")
          .from("wallet_passes")
          .select("state")
          .eq("code", code)
          .maybeSingle()
      ),
    queryKey: ["membership", "wallet", code],
  });
  // Google's save message may never have come: ask Google once whether the
  // pass is held, and record it.
  const queryClient = useQueryClient();
  const check = useQuery({
    enabled: pass.isSuccess && pass.data?.state !== "saved",
    queryFn: async () => {
      const result = await callApi<{ configured: boolean; saved: boolean }>(
        supabase,
        "/wallet/google",
        { check: true }
      );
      if (result.saved) {
        await queryClient.invalidateQueries({
          queryKey: ["membership", "wallet", code],
        });
      }
      return result;
    },
    queryKey: ["membership", "wallet-check", code],
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const add = async () => {
    setState("busy");
    try {
      const { url } = await callApi<{ url: string }>(
        supabase,
        "/wallet/google",
        {}
      );
      window.location.assign(url);
    } catch {
      setState("unavailable");
    }
  };
  if (pass.data?.state === "saved") {
    return <p className="type-caption">{t("inWallet")}</p>;
  }
  // Until Google Wallet is set up for the Society, there is nothing to add.
  if (check.data?.configured === false) {
    return null;
  }
  return (
    <>
      <Button
        className="px-0"
        disabled={state === "busy"}
        onClick={add}
        variant="link"
      >
        {t("wallet")}
      </Button>
      {state === "unavailable" ? (
        <p className="type-caption" role="status">
          {t("walletUnavailable")}
        </p>
      ) : null}
    </>
  );
};

/**
 * The membership card: paper, the lockup, the member's name, a line pattern
 * drawn from the card number, and a QR that changes every 30 seconds. The
 * QR links to auibsal.org/verify/member/<code>?t=<digits>: any phone camera
 * opens the check, and officers at the door scan it to check members in.
 * The card is an object, like a certificate: it keeps the light theme.
 */
export const MembershipCard = () => {
  const t = useTranslations("diwan.home");
  const locale = useLocale() as "en" | "ar";
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const status = useMemberStatus();
  const mine = useMyMembership();
  const kind = mine.data?.kind ?? null;
  const profile = useProfile();
  const card = useQuery({
    // Every membership carries the card (owner, Oct 31, 2026).
    enabled: Boolean(user && kind),
    queryFn: () => membership.myCard(supabase),
    queryKey: [...cardKey, user?.id],
  });
  const reissue = useMutation({
    mutationFn: () => membership.reissueCard(supabase),
    onSuccess: (fresh) =>
      queryClient.setQueryData([...cardKey, user?.id], fresh),
  });
  const live = useLiveCode(card.data?.secret);

  if (!(kind && status.data && profile.data && card.data)) {
    return null;
  }

  const name =
    (locale === "ar" && profile.data.full_name_ar) || profile.data.full_name_en;
  const link = live.digits
    ? siteUrl(locale, membership.livePath(card.data.code, live.digits))
    : null;
  // A member's tier; a guest's or a partner's card says which it is.
  let tier = "";
  if (kind !== "member") {
    tier = t(`kinds.${kind}`);
  } else if (status.data.tier) {
    tier = t(`tiers.${status.data.tier}`);
  }

  const code = (size: number) =>
    link ? (
      <QRCode
        aria-label={t("card.checkLink")}
        className="h-auto w-full"
        size={size}
        value={link}
      />
    ) : (
      <span className="block aspect-square w-full" />
    );

  return (
    <section aria-labelledby="membership-card" className="grid gap-4">
      <h2 className="sr-only" id="membership-card">
        {t("card.title")}
      </h2>
      <CardFace
        classLabel={tier}
        labels={{
          class: t("card.tier"),
          number: t("card.numberLabel"),
          qr: t("card.checkLink"),
        }}
        locale={locale}
        name={name}
        number={card.data.number}
        qr={{ left: live.secondsLeft / TOTP_PERIOD_SECONDS, value: link }}
        since={
          kind === "member" && status.data.member_since
            ? t("card.since", {
                date: sinceMonth(status.data.member_since, locale),
              })
            : undefined
        }
        title={t("card.title")}
      />
      {/* How it is used, under the card rather than on it. */}
      <p className="type-caption max-w-3xl">{t("card.qr")}</p>
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
              <div className="w-full max-w-72">{code(288)}</div>
              <p className="type-label text-text-secondary">
                {t("card.number", { number: cardNumber(card.data.number) })}
              </p>
            </div>
          </DialogContent>
        </Dialog>
        <WalletLink code={card.data.code} />
        {link ? (
          <a className="link type-caption" href={link}>
            {t("card.open")}
          </a>
        ) : null}
      </div>
      <details className="max-w-3xl">
        <summary className="type-caption cursor-pointer">
          {t("card.security")}
        </summary>
        <div className="grid gap-3 pt-3">
          <p className="type-caption">{t("card.securityBody")}</p>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="justify-self-start px-0" variant="link">
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
          {card.data.issued_at ? (
            <p className="type-caption">
              {t("card.issued", {
                date: formatLongDate(card.data.issued_at, locale, true),
              })}
            </p>
          ) : null}
        </div>
      </details>
    </section>
  );
};
