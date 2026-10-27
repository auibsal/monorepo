"use client";

import { useAuth } from "@repo/auth/provider";
import { BrandLogo } from "@repo/design-system/components/brand-logo";
import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { Label } from "@repo/design-system/components/ui/label";
import { siteUrl } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { localized, membership, partners, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { Guilloche } from "@/components/guilloche";
import { callApi } from "@/lib/nexus/api";
import {
  embedHeight,
  passCardUrl,
  passClientId,
  passEmbedded,
  passEmbedUrl,
  passEnabled,
} from "@/lib/nexus/pass-enabled";
import { useMemberStatus, useProfile } from "@/lib/nexus/queries";
import {
  TOTP_PERIOD_SECONDS,
  totp,
  totpSecondsLeft,
  totpStep,
} from "@/lib/totp";

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

/** How far the card leans, at most, in degrees. */
const MAX_TILT = 8;

interface MotionPermission {
  requestPermission?: () => Promise<string>;
}

/**
 * The card in the hand: it leans toward a finger or the pointer, and with
 * the phone where the browser reports its tilt (iPhones ask once, on the
 * first touch of the card), and the light moves across it as it does.
 * Still for anyone who asks for less motion. Writes --rx, --ry and
 * --sheen on the card; the card's transform and the sheen read them.
 */
const useCardMotion = () => {
  const ref = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const card = ref.current;
    if (
      !card ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const tilt = { x: 0, y: 0 };
    let frame = 0;
    const onTilt = (event: DeviceOrientationEvent) => {
      if (event.gamma === null || event.beta === null) {
        return;
      }
      // Held at about 45 degrees is the rest position.
      target.current = {
        x: Math.max(-1, Math.min(1, (event.beta - 45) / 30)),
        y: Math.max(-1, Math.min(1, event.gamma / 30)),
      };
    };
    const draw = (time: number) => {
      tilt.x += (target.current.x - tilt.x) * 0.08;
      tilt.y += (target.current.y - tilt.y) * 0.08;
      const drift = 18 * Math.sin(time / 2600);
      card.style.setProperty("--rx", `${(-tilt.x * MAX_TILT).toFixed(2)}deg`);
      card.style.setProperty("--ry", `${(tilt.y * MAX_TILT).toFixed(2)}deg`);
      card.style.setProperty(
        "--sheen",
        `${(50 + tilt.y * 40 + drift).toFixed(1)}%`
      );
      frame = window.requestAnimationFrame(draw);
    };
    window.addEventListener("deviceorientation", onTilt);
    frame = window.requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("deviceorientation", onTilt);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    target.current = {
      x: ((event.clientY - box.top) / box.height) * 2 - 1,
      y: ((event.clientX - box.left) / box.width) * 2 - 1,
    };
  };
  const onPointerLeave = () => {
    target.current = { x: 0, y: 0 };
  };
  const onPointerDown = () => {
    // iPhones report the tilt only after asking, from a touch; they ask
    // the member once and remember the answer.
    const motion = window.DeviceOrientationEvent as unknown as
      | MotionPermission
      | undefined;
    motion?.requestPermission?.().catch(() => undefined);
  };
  return { onPointerDown, onPointerLeave, onPointerMove, ref };
};

/** The light across the card, where the card's motion puts it. */
const Sheen = () => (
  <span
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_calc(var(--sheen,50%)-16%),color-mix(in_oklab,var(--surface)_85%,transparent)_var(--sheen,50%),transparent_calc(var(--sheen,50%)+16%))] opacity-70 mix-blend-overlay"
  />
);

/** "Live", with a slow beat, beside the ticking clock. */
const LiveMark = () => {
  const t = useTranslations("nexus.home.card");
  return (
    <span className="type-label inline-flex items-center gap-1.5 text-text">
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full bg-accent motion-safe:animate-pulse"
      />
      {t("live")}
    </span>
  );
};

/**
 * Add to Google Wallet: the pass carries the same live code. Once Google
 * says the member saved it, the card says so instead.
 */
const WalletLink = ({ code }: { code: string }) => {
  const t = useTranslations("nexus.home.card");
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
 * Whether the card's check page lists the member's certificates. Off by
 * default: anyone holding the card's link would see the record.
 */
const RecordSetting = () => {
  const t = useTranslations("nexus.home.card");
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const key = ["card-record-setting", user?.id];
  const setting = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      Boolean(
        unwrap(
          await supabase
            .schema("core")
            .from("profiles")
            .select("show_certificates_on_card")
            .eq("id", user?.id ?? "")
            .single()
        )?.show_certificates_on_card
      ),
    queryKey: key,
  });
  const save = useMutation({
    mutationFn: async (show: boolean) =>
      unwrap(
        await supabase
          .schema("core")
          .from("profiles")
          .update({ show_certificates_on_card: show })
          .eq("id", user?.id ?? "")
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        checked={setting.data ?? false}
        disabled={setting.isPending || save.isPending}
        id="card-record"
        onCheckedChange={(value) => save.mutate(value === true)}
      />
      <div className="grid gap-1">
        <Label className="leading-normal" htmlFor="card-record">
          {t("showRecord")}
        </Label>
        <p className="type-caption">{t("showRecordHint")}</p>
      </div>
    </div>
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
const SalCard = () => {
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
  const motion = useCardMotion();

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
        className="relative grid max-w-3xl gap-8 overflow-hidden border border-line bg-surface-reading p-6 text-text [transform:perspective(1100px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] sm:grid-cols-[1fr_auto] sm:p-8"
        data-theme="light"
        onPointerDown={motion.onPointerDown}
        onPointerLeave={motion.onPointerLeave}
        onPointerMove={motion.onPointerMove}
        ref={motion.ref}
      >
        <div className="pointer-events-none absolute start-1/4 top-1/2 size-[26rem] -translate-x-1/2 -translate-y-1/2 rtl:translate-x-1/2">
          <Guilloche
            className="size-full opacity-40 motion-safe:animate-[spin_180s_linear_infinite]"
            number={card.data.number}
          />
        </div>
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
          <p className="flex items-center gap-3">
            <LiveMark />
            <span className="type-code text-text tabular-nums" dir="ltr">
              <span className="sr-only">{t("card.clock")} </span>
              {clock(live.now, locale)}
            </span>
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
        <WalletLink code={card.data.code} />
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
          <RecordSetting />
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

/**
 * The live Pass card, framed from The IDEA once it lets SAL embed it: The
 * IDEA's own page, signed in to The IDEA, so the code never reaches SAL. It
 * reports its height (only to SAL's verified domain); nothing else crosses.
 */
const LiveCard = () => {
  const t = useTranslations("nexus.home");
  const locale = useLocale();
  const [height, setHeight] = useState(320);
  useEffect(() => {
    const listen = (event: MessageEvent) => {
      const next = embedHeight(event);
      if (next) {
        setHeight(next);
      }
    };
    window.addEventListener("message", listen);
    return () => window.removeEventListener("message", listen);
  }, []);
  return (
    <iframe
      className="w-full max-w-md border-0"
      src={passEmbedUrl(locale, passClientId)}
      style={{ height }}
      title={t("passCard.live")}
    />
  );
};

/**
 * The IDEA Pass card, which replaces SAL's own once the Pass is on (owner,
 * 2026-10-27): the live card framed from The IDEA once it allows that, else
 * the picture The IDEA drew for this member (read at sign-in, no QR) and a
 * link to the live card; and what membership means here. Perks come with
 * the Pass, so the card lists none.
 */
const PassCard = () => {
  const t = useTranslations("nexus.home");
  const tc = useTranslations("common");
  const locale = useLocale() as "en" | "ar";
  const { supabase, user } = useAuth();
  const status = useMemberStatus();
  const card = useQuery({
    enabled: Boolean(user && status.data?.is_member) && !passEmbedded,
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("access")
          .from("pass_links")
          .select("card_svg_en, card_svg_ar")
          .maybeSingle()
      ),
    queryKey: ["pass-card", user?.id],
  });

  if (!status.data?.is_member) {
    return null;
  }
  const svg =
    (locale === "ar" ? card.data?.card_svg_ar : card.data?.card_svg_en) ||
    card.data?.card_svg_en ||
    card.data?.card_svg_ar;
  const tier = status.data.tier ? t(`tiers.${status.data.tier}`) : "";

  return (
    <section aria-labelledby="pass-card" className="grid max-w-3xl gap-5">
      <h2 className="type-heading" id="pass-card">
        {t("passCard.title")}
      </h2>
      {passEmbedded ? <LiveCard /> : null}
      {!passEmbedded && svg ? (
        // biome-ignore lint/performance/noImgElement: The IDEA's drawing of the card, kept as SVG text
        <img
          alt={t("passCard.alt")}
          className="h-auto w-full max-w-md"
          height={270}
          src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
          width={428}
        />
      ) : null}
      <p className="type-body">{t("passCard.body")}</p>
      <a
        className="link inline-flex items-center gap-1 justify-self-start"
        href={passCardUrl(locale)}
        rel="noopener"
        target="_blank"
      >
        {t("passCard.open")}
        <ExternalLink aria-label={tc("externalLink")} className="size-3.5" />
      </a>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-4 border-line border-t pt-4 sm:grid-cols-3">
        {status.data.member_since ? (
          <Field
            label={t("card.since")}
            value={sinceMonth(status.data.member_since, locale)}
          />
        ) : null}
        {tier ? <Field label={t("card.tier")} value={tier} /> : null}
        <Field
          label={t("card.vote")}
          value={status.data.voting_member ? t("card.votes") : t("card.noVote")}
        />
      </dl>
    </section>
  );
};

/** The member's card: the IDEA Pass once it is on, SAL's own until then. */
export const MembershipCard = passEnabled ? PassCard : SalCard;
