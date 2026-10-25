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
import { localized, membership, partners } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { callApi } from "@/lib/nexus/api";
import { useMemberStatus, useProfile } from "@/lib/nexus/queries";
import {
  TOTP_PERIOD_SECONDS,
  totp,
  totpSecondsLeft,
  totpStep,
} from "@/lib/totp";
import { Guilloche } from "./guilloche";

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

/** The card's ticking clock, Baghdad time with seconds. */
const clock = (at: number, locale: string) =>
  new Intl.DateTimeFormat(locale === "ar" ? "ar-IQ-u-nu-latn" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Baghdad",
  }).format(at);

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="grid content-start gap-1">
    <dt className="type-label text-text-secondary">{label}</dt>
    <dd className="font-medium text-text tabular-nums">{value}</dd>
  </div>
);

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
 * The sheen across the card: it drifts with time and follows the phone's
 * tilt where the browser reports it. Still for anyone who asks for less
 * motion.
 */
const Sheen = () => {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    let tilt = 0;
    let frame = 0;
    const onTilt = (event: DeviceOrientationEvent) => {
      tilt = (event.gamma ?? 0) / 45;
    };
    const draw = (time: number) => {
      const position = 50 + 45 * Math.sin(time / 2600 + tilt);
      ref.current?.style.setProperty("--sheen", `${position}%`);
      frame = window.requestAnimationFrame(draw);
    };
    window.addEventListener("deviceorientation", onTilt);
    frame = window.requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("deviceorientation", onTilt);
      window.cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_calc(var(--sheen,50%)-14%),color-mix(in_oklab,var(--surface)_70%,transparent)_var(--sheen,50%),transparent_calc(var(--sheen,50%)+14%))] mix-blend-soft-light"
      ref={ref}
    />
  );
};

/** Add to Google Wallet: the pass carries the same live code. */
const WalletLink = () => {
  const t = useTranslations("nexus.home.card");
  const { supabase } = useAuth();
  const [state, setState] = useState<"idle" | "busy" | "unavailable">("idle");
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

/** Perks: what partners offer members who show this card. */
const Perks = () => {
  const t = useTranslations("nexus.home.card");
  const locale = useLocale();
  const { supabase } = useAuth();
  const offers = useQuery({
    queryFn: () => partners.memberOffers(supabase),
    queryKey: ["offers"],
  });
  if (!offers.data?.length) {
    return null;
  }
  return (
    <div className="grid max-w-3xl gap-3">
      <h3 className="type-heading">{t("perks")}</h3>
      <p className="type-caption">{t("perksHow")}</p>
      <ul className="grid divide-y divide-line border-line border-y">
        {offers.data.map((offer) => (
          <li className="grid gap-1 py-3" key={offer.id}>
            <p className="font-medium">{localized(offer, "title", locale)}</p>
            <p className="type-body whitespace-pre-line" dir="auto">
              {localized(offer, "details", locale)}
            </p>
            {offer.code ? (
              <p className="type-caption">
                {t("perkCode")}{" "}
                <code className="type-code" dir="ltr">
                  {offer.code}
                </code>
              </p>
            ) : null}
            {offer.ends_on ? (
              <p className="type-caption">
                {t("perkUntil", {
                  date: formatLongDate(offer.ends_on, locale),
                })}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
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
  const live = useLiveCode(card.data?.secret);

  if (!(status.data?.is_member && profile.data && card.data)) {
    return null;
  }

  const name =
    (locale === "ar" && profile.data.full_name_ar) || profile.data.full_name_en;
  const link = live.digits
    ? siteUrl(locale, membership.livePath(card.data.code, live.digits))
    : null;
  const tier = status.data.tier ? t(`tiers.${status.data.tier}`) : "";
  const left = (live.secondsLeft / TOTP_PERIOD_SECONDS) * 100;

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
      <div
        className="relative grid max-w-3xl gap-8 overflow-hidden border border-line bg-surface-reading p-6 text-text sm:grid-cols-[1fr_auto] sm:p-8"
        data-theme="light"
      >
        <Guilloche
          className="pointer-events-none absolute -end-24 -top-24 size-[30rem] opacity-80"
          number={card.data.number}
        />
        <Sheen />
        <div className="relative grid content-between gap-8">
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
        <figure className="relative grid content-start justify-items-center gap-2 sm:border-line sm:border-s sm:ps-8">
          <div className="grid w-40 gap-2 bg-surface p-3">
            {code(148)}
            {/* Time left on this code: a hairline that empties. */}
            <span aria-hidden="true" className="h-px w-full bg-line">
              <span
                className="block h-px bg-text transition-[width] duration-1000 ease-linear"
                style={{ width: `${left}%` }}
              />
            </span>
          </div>
          <p className="type-code text-text tabular-nums" dir="ltr">
            <span className="sr-only">{t("card.clock")} </span>
            {clock(live.now, locale)}
          </p>
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
              <div className="w-full max-w-72">{code(288)}</div>
              <p className="type-code tabular-nums" dir="ltr">
                {clock(live.now, locale)}
              </p>
              <p className="type-label text-text-secondary">
                {t("card.number", { number: cardNumber(card.data.number) })}
              </p>
            </div>
          </DialogContent>
        </Dialog>
        <WalletLink />
        {link ? (
          <a className="link type-caption" href={link}>
            {t("card.open")}
          </a>
        ) : null}
      </div>
      <Perks />
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
