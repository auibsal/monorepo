"use client";

import { type PointerEvent, useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { cn } from "../../lib/utils";
import { BrandLogo } from "../brand-logo";
import { Guilloche } from "./guilloche";

/** The card number as printed: five digits (No. 00042). */
export const cardNumber = (value: number) => String(value).padStart(5, "0");

/** How far the card leans, at most, in degrees. */
const MAX_TILT = 8;

interface MotionPermission {
  requestPermission?: () => Promise<string>;
}

/** Whether the reader asks for less motion, following the setting live. */
const useReducedMotion = () => {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
};

/** Whether the element is on screen; off screen, nothing on it moves. */
const useOnScreen = (ref: { readonly current: Element | null }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(Boolean(entry?.isIntersecting))
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return visible;
};

/**
 * The card in the hand: it leans toward a finger or the pointer, and with
 * the phone where the browser reports its tilt (iPhones ask once, on the
 * first touch of the card), and the light moves across it as it does.
 * Still for anyone who asks for less motion, from the moment they change
 * the setting (the one exception to the brand's "no 3D", decisions §6),
 * and paused while the card is off screen. Writes --rx, --ry and --sheen
 * on the card; the card's transform and the sheen read them.
 */
const useCardMotion = (still: boolean) => {
  const ref = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const reduced = useReducedMotion();
  const visible = useOnScreen(ref);
  const moving = !(still || reduced) && visible;

  useEffect(() => {
    const card = ref.current;
    if (!(moving && card)) {
      if (card) {
        card.style.removeProperty("--rx");
        card.style.removeProperty("--ry");
        card.style.removeProperty("--sheen");
      }
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
  }, [moving]);

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
  return { moving, onPointerDown, onPointerLeave, onPointerMove, ref };
};

/** The light across the card, where the card's motion puts it. */
const Sheen = () => (
  <span
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_calc(var(--sheen,50%)-16%),color-mix(in_oklab,var(--surface)_85%,transparent)_var(--sheen,50%),transparent_calc(var(--sheen,50%)+16%))] opacity-70 mix-blend-overlay"
  />
);

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="grid content-start gap-1">
    <dt className="type-label text-text-secondary">{label}</dt>
    <dd className="text-text font-medium tabular-nums">{value}</dd>
  </div>
);

export interface MembershipCardProps {
  /** The class, already in words: Member, Associate Member, Honorary Member. */
  readonly classLabel?: string;
  readonly className?: string;
  readonly labels: {
    /** "Class". */
    readonly class: string;
    /** "No." */
    readonly number: string;
    /** What the QR opens, for screen readers. */
    readonly qr: string;
  };
  readonly locale: "en" | "ar";
  /** The member's name in the card's language. */
  readonly name: string;
  /** The number from the one series; printed with five digits. */
  readonly number: number;
  /**
   * The role held now, in the card's language, on the line under the name
   * ("Editor-in-Chief", "Event Lead, Writing workshop"); none without one.
   */
  readonly office?: string | null;
  /**
   * The live QR: its link (null while the first code is made) and the share
   * of its 30 seconds still to run, 0 to 1. A printed card passes no
   * `left`: the code has no countdown on paper.
   */
  readonly qr: { readonly left?: number; readonly value: string | null };
  /** "Since 2026", already formatted. */
  readonly since?: string;
  /** A printed card holds still. */
  readonly still?: boolean;
  /** "Membership card". */
  readonly title: string;
}

/**
 * The membership card (SAL-MED-02; decisions §6, §11: "membership card",
 * never "ID card"): paper, the lockup, the name, the current role on the
 * line under it while it is held, the number and the class (or Guest), a
 * rosette drawn from the number, the year since and the live QR, which
 * links to auibsal.org/verify/member/<code>?t=<digits> and changes every 30
 * seconds. One design: the account, Google Wallet (the same fields) and a
 * card printed on request all show this one. The card is an object, like a
 * certificate: it keeps the light theme.
 */
export const MembershipCard = ({
  classLabel,
  className,
  labels,
  locale,
  name,
  number,
  office,
  qr,
  since,
  still = false,
  title,
}: MembershipCardProps) => {
  const motion = useCardMotion(still);
  return (
    <div
      className={cn(
        "border-line bg-surface-reading text-text relative grid max-w-3xl [transform:perspective(1100px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] gap-8 overflow-hidden border p-6 sm:grid-cols-[1fr_auto] sm:p-8 print:break-inside-avoid",
        className
      )}
      data-theme="light"
      lang={locale}
      onPointerDown={motion.onPointerDown}
      onPointerLeave={motion.onPointerLeave}
      onPointerMove={motion.onPointerMove}
      ref={motion.ref}
    >
      <div className="pointer-events-none absolute start-1/4 top-1/2 size-[26rem] -translate-x-1/2 -translate-y-1/2 rtl:translate-x-1/2">
        <Guilloche
          className={cn(
            "size-full opacity-40",
            motion.moving && "animate-[spin_180s_linear_infinite]"
          )}
          number={number}
        />
      </div>
      <Sheen />
      <div className="relative grid content-between gap-8">
        <div className="flex items-start justify-between gap-4">
          <BrandLogo ground="light" height={44} locale={locale} />
          <p className="type-label text-text-secondary pt-1 text-end">
            {title}
          </p>
        </div>
        <div className="grid gap-2">
          <p className="type-display text-balance" dir="auto">
            {name}
          </p>
          {office ? (
            <p className="type-heading text-text-secondary" dir="auto">
              {office}
            </p>
          ) : null}
        </div>
        <dl className="border-line grid grid-cols-2 gap-x-8 gap-y-4 border-t pt-4 sm:grid-cols-4">
          <Field label={labels.number} value={cardNumber(number)} />
          {classLabel ? (
            <Field label={labels.class} value={classLabel} />
          ) : null}
        </dl>
      </div>
      <figure className="sm:border-line relative grid content-start justify-items-center gap-2 sm:border-s sm:ps-8">
        <div className="bg-surface grid w-40 gap-2 p-3">
          {qr.value ? (
            <QRCode
              aria-label={labels.qr}
              className="h-auto w-full"
              size={148}
              value={qr.value}
            />
          ) : (
            <span className="block aspect-square w-full" />
          )}
          {/* Time left on this code: a hairline that empties. */}
          {qr.left === undefined ? null : (
            <span aria-hidden="true" className="bg-line h-px w-full">
              <span
                className="bg-text block h-px transition-[width] duration-1000 ease-linear"
                style={{ width: `${qr.left * 100}%` }}
              />
            </span>
          )}
        </div>
        {since ? (
          <figcaption className="type-label text-text-secondary text-center">
            {since}
          </figcaption>
        ) : null}
      </figure>
      {/* The one accent on the card: a crimson rule along its foot. */}
      <span
        aria-hidden="true"
        className="bg-accent absolute inset-x-0 bottom-0 h-1.5"
      />
    </div>
  );
};
