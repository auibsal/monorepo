"use client";

import { Button } from "@repo/design-system/components/ui/button";
import jsQR from "jsqr";
import { useTranslations } from "next-intl";
import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

// The card's QR is a link (…/verify/member/<code>?t=<digits>, in any
// language); the digits change every 30 seconds.
const CARD =
  /^https?:\/\/[^/]+(?:\/[a-z]{2})?\/verify\/member\/([0-9a-f]{20})\/?(?:\?t=([0-9]{8}))?$/;

/** A membership card's code and live digits, from what its QR holds. */
export const parseCard = (value: string) => {
  const card = CARD.exec(value.trim());
  return card?.[1]
    ? ({ card_code: card[1], digits: card[2] ?? "" } as const)
    : null;
};

const SCAN_INTERVAL_MS = 250;
const SAME_CODE_PAUSE_MS = 3000;

/** Reads a DOM ref (null until mounted). */
const current = <T,>(ref: RefObject<T | null>): T | null => ref.current; // i18n-ignore: code, not text

/**
 * The phone's camera, reading QR codes: each new code (the same one is
 * ignored for three seconds) goes to `onCode`. Used at the door and on the
 * Typewriter Tour.
 */
export const CardScanner = ({
  onCode,
}: {
  onCode: (value: string) => void;
}) => {
  const t = useTranslations("nexus.admin.checkIn");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastCode = useRef<{ at: number; value: string } | null>(null);
  const [camera, setCamera] = useState<"off" | "on" | "unavailable">("off");

  const handle = useCallback(
    (value: string) => {
      const now = Date.now();
      if (
        lastCode.current?.value === value &&
        now - lastCode.current.at < SAME_CODE_PAUSE_MS
      ) {
        return;
      }
      lastCode.current = { at: now, value };
      onCode(value);
    },
    [onCode]
  );

  const stop = useCallback(() => {
    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    streamRef.current = null;
    setCamera((c) => (c === "on" ? "off" : c));
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      const video = current(videoRef);
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setCamera("on");
    } catch {
      setCamera("unavailable");
    }
  };

  useEffect(() => {
    if (camera !== "on") {
      return;
    }
    const timer = window.setInterval(() => {
      const video = current(videoRef);
      const canvas = current(canvasRef);
      if (!(video && canvas) || video.readyState < video.HAVE_ENOUGH_DATA) {
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        return;
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(image.data, image.width, image.height, {
        inversionAttempts: "dontInvert",
      });
      if (code?.data) {
        handle(code.data);
      }
    }, SCAN_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [camera, handle]);

  useEffect(() => stop, [stop]);

  return (
    <div className="grid gap-3">
      <video
        aria-label={t("video")}
        className={camera === "on" ? "w-full border-line border-t" : "hidden"}
        muted
        playsInline
        ref={videoRef}
      />
      <canvas className="hidden" ref={canvasRef} />
      {camera === "on" ? (
        <Button className="justify-self-start" onClick={stop} variant="outline">
          {t("stopCamera")}
        </Button>
      ) : (
        <Button className="justify-self-start" onClick={start}>
          {t("startCamera")}
        </Button>
      )}
      {camera === "unavailable" ? (
        <p className="type-body text-text-secondary">
          {t("cameraUnavailable")}
        </p>
      ) : null}
    </div>
  );
};
