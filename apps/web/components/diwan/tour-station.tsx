"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { Link } from "@repo/internationalization/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";
import { ApiError, callApi, callApiForm } from "@/lib/diwan/api";
import { CardScanner, parseCard } from "./admin/card-scanner";
import { ErrorLine } from "./admin/kit";
import { DiwanPage } from "./page";

type Holder =
  | { card_code: string; digits: string; kind: "card" }
  | { email: string; kind: "request" };

/** The station's refusals it can explain. */
const KNOWN = new Set([
  "card_not_live",
  "no_pending_request",
  "station_closed",
  "too_large",
  "type_not_allowed",
]);

/**
 * The Tour's station (decisions §12): for a trained volunteer, confirmed
 * on a station shift, while it runs. It does one thing: photograph the
 * typed page, then scan the writer's live card (a Member's or a Guest's)
 * or, for faculty, staff and alumni, find the Associate request they just
 * sent. The page is theirs, private, until they choose otherwise. Every
 * page is logged; the station closes with the shift.
 */
export const TourStation = () => {
  const t = useTranslations("diwan.station");
  const { supabase } = useAuth();
  const photoId = useId();
  const emailId = useId();
  const [photo, setPhoto] = useState<File | null>(null);
  const [mode, setMode] = useState<"card" | "request">("card");
  const [email, setEmail] = useState("");
  const [notCard, setNotCard] = useState(false);

  const shift = useQuery({
    queryFn: async () =>
      unwrap(await supabase.schema("programmes").rpc("my_station_shift")),
    queryKey: ["station", "shift"],
    refetchInterval: 60_000,
  });

  const attach = useMutation({
    mutationFn: async (holder: Holder) => {
      const form = new FormData();
      form.set("photo", photo as File);
      if (holder.kind === "card") {
        form.set("card_code", holder.card_code);
        form.set("digits", holder.digits);
      } else {
        form.set("request_email", holder.email);
      }
      return await callApiForm<{ reference: string }>(
        supabase,
        "/tour/station",
        form
      );
    },
    onSuccess: () => {
      setPhoto(null);
      setEmail("");
    },
  });

  if (shift.isPending) {
    return null;
  }
  if (!shift.data) {
    return (
      <DiwanPage narrow title={t("title")}>
        <div className="grid gap-3">
          <p className="type-body">{t("closed")}</p>
          <p className="type-caption text-text-secondary">{t("closedHint")}</p>
        </div>
      </DiwanPage>
    );
  }

  const refusal =
    attach.error instanceof ApiError && KNOWN.has(attach.error.code)
      ? attach.error.code
      : null;

  return (
    <DiwanPage lede={t("lede")} narrow title={t("title")}>
      <div className="grid gap-6">
        <section className="grid gap-3">
          <h2 className="type-subheading">{t("step1")}</h2>
          <label className="grid gap-2" htmlFor={photoId}>
            <span className="type-label">{t("photo")}</span>
            <input
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="type-body"
              id={photoId}
              onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
              type="file"
            />
          </label>
        </section>

        {photo ? (
          <section className="grid gap-3">
            <h2 className="type-subheading">{t("step2")}</h2>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => setMode("card")}
                variant={mode === "card" ? "default" : "outline"}
              >
                {t("byCard")}
              </Button>
              <Button
                onClick={() => setMode("request")}
                variant={mode === "card" ? "outline" : "default"}
              >
                {t("byRequest")}
              </Button>
            </div>
            {mode === "card" ? (
              <>
                <p className="type-caption text-text-secondary">
                  {t("cardHint")}{" "}
                  <Link className="link" href="/sign-up/guest">
                    {t("guestLink")}
                  </Link>
                </p>
                <CardScanner
                  onCode={(value) => {
                    const card = parseCard(value);
                    setNotCard(!card);
                    if (card && !attach.isPending) {
                      attach.mutate({ ...card, kind: "card" });
                    }
                  }}
                />
              </>
            ) : (
              <form
                className="grid gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  attach.mutate({ email: email.trim(), kind: "request" });
                }}
              >
                <p className="type-caption text-text-secondary">
                  {t("requestHint")}{" "}
                  <Link className="link" href="/join#associate">
                    {t("requestLink")}
                  </Link>
                </p>
                <label className="grid gap-2" htmlFor={emailId}>
                  <span className="type-label">{t("requestEmail")}</span>
                  <Input
                    dir="ltr"
                    id={emailId}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    value={email}
                  />
                </label>
                <Button
                  className="justify-self-start"
                  disabled={!email.trim() || attach.isPending}
                  type="submit"
                >
                  {t("keep")}
                </Button>
              </form>
            )}
          </section>
        ) : null}

        <div aria-live="polite" className="grid gap-2">
          {attach.data ? (
            <p className="type-body font-medium">
              {t("kept", { reference: attach.data.reference })}
            </p>
          ) : null}
          {notCard ? <p className="type-body">{t("notCard")}</p> : null}
          {refusal ? (
            <p className="type-body font-medium" role="alert">
              {t(`refusals.${refusal}` as never)}
            </p>
          ) : null}
        </div>
        <ErrorLine error={refusal ? null : attach.error} />
      </div>
    </DiwanPage>
  );
};

/**
 * The page as the station photographed it, for its writer and whoever
 * runs the Tour: a five-minute link from /api/tour/photo, asked for when
 * the button is pressed.
 */
export const PagePhoto = ({ id }: { id: string }) => {
  const t = useTranslations("diwan.station");
  const { supabase } = useAuth();
  const link = useMutation({
    mutationFn: () => callApi<{ url: string }>(supabase, "/tour/photo", { id }),
  });
  if (link.data) {
    return (
      // biome-ignore lint/performance/noImgElement: a signed, five-minute link
      <img
        alt={t("photoAlt")}
        className="border-line max-h-96 w-auto border"
        height={600}
        src={link.data.url}
        width={800}
      />
    );
  }
  return (
    <div className="grid gap-2">
      <Button
        className="justify-self-start"
        disabled={link.isPending}
        onClick={() => link.mutate()}
        size="sm"
        variant="outline"
      >
        {t("seePage")}
      </Button>
      <ErrorLine error={link.error} />
    </div>
  );
};
