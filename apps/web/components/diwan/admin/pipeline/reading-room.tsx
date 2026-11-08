"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Label } from "@repo/brand/components/ui/label";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { MySignature } from "@/components/signature";
import { callApi } from "@/lib/diwan/api";
import { SectionSpinner } from "../../states";
import { ErrorLine } from "../kit";
import { pipelineKey } from "./data";
import { TextView } from "./text-view";

const PLEDGE_POINTS = [
  "confidential",
  "noCopies",
  "noSharing",
  "stepAside",
] as const;

const usePledge = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      (unwrap(await supabase.schema("journal").rpc("my_reader_pledge")) ??
        [])[0] ?? null,
    queryKey: [...pipelineKey, "pledge"],
  });
};

/**
 * The readers' pledge is F-40, the Confidentiality pledge, signed here in
 * the reader's name on the platform (once, and again for a new version).
 */
const Pledge = () => {
  const t = useTranslations("diwan.admin.pipeline.pledge");
  const tf = useTranslations("diwan.forms");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [agreed, setAgreed] = useState(false);
  const sign = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .rpc("sign_reader_pledge", { esign_agreed: agreed })
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pipelineKey }),
  });
  return (
    <section className="border-line grid max-w-2xl gap-3 border-t pt-4">
      <h2 className="type-subheading">{t("title")}</h2>
      <p>{t("intro")}</p>
      <ul className="grid list-disc gap-1 ps-5">
        {PLEDGE_POINTS.map((point) => (
          <li key={point}>{t(`points.${point}`)}</li>
        ))}
      </ul>
      <MySignature />
      <div className="flex items-start gap-2">
        <Checkbox
          checked={agreed}
          id="pledge-esign"
          onCheckedChange={(checked) => setAgreed(checked === true)}
        />
        <Label className="font-normal" htmlFor="pledge-esign">
          {tf("esignAgree")}
        </Label>
      </div>
      <Button
        className="justify-self-start"
        disabled={!agreed || sign.isPending}
        onClick={() => sign.mutate()}
      >
        {t("agree")}
      </Button>
      <ErrorLine error={sign.error} />
    </section>
  );
};

const STOPPED = ["contextmenu", "copy", "cut", "dragstart"] as const;
/** The brand's ash (tokens.css --sal-ash): faint on paper and on ink. */
const ASH = "#5c6568";

const escapeXml = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/**
 * The reader's mark as a tile repeated across the work: drawn, not text,
 * so it is neither read aloud nor selected with the work.
 */
const markTile = (mark: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="180"><text x="20" y="120" transform="rotate(-18 180 90)" font-family="sans-serif" font-size="14" fill="${ASH}" fill-opacity="0.22">${escapeXml(mark)}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

/** Readers' marked images, as the API sends them (never a file address). */
interface MarkedImage {
  height: number;
  key: string;
  src: string | null;
  width: number;
}

/**
 * The work as readers see it: on the page only, with their mark across it.
 * Selecting, copying, dragging, the context menu and printing are turned
 * off, a speed bump rather than a lock (a screen can always be
 * photographed); the text stays in the page, so the keyboard and screen
 * readers read it as any other text.
 */
const Protected = ({
  children,
  mark,
}: {
  children: ReactNode;
  mark: string;
}) => {
  const t = useTranslations("diwan.admin.pipeline.room");
  const area = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = area.current;
    const stop = (event: Event) => event.preventDefault();
    for (const type of STOPPED) {
      node?.addEventListener(type, stop);
    }
    return () => {
      for (const type of STOPPED) {
        node?.removeEventListener(type, stop);
      }
    };
  }, []);
  return (
    <>
      <div className="relative select-none print:hidden" ref={area}>
        {children}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: markTile(mark) }}
        />
      </div>
      <p className="hidden print:block">{t("notPrinted")}</p>
    </>
  );
};

/**
 * A blind entry's text and images, after the readers' pledge. No file
 * reaches the page: the text is the work as sent, and images are copies
 * marked with the reader's card number and the day.
 */
export const ReadingRoom = ({
  entryId,
  language,
}: {
  entryId: string;
  language: string;
}) => {
  const t = useTranslations("diwan.admin.pipeline");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const pledge = usePledge();
  const pledged = Boolean(pledge.data?.current);
  const text = useQuery({
    enabled: pledged,
    queryFn: async () =>
      (unwrap(
        await supabase.schema("journal").rpc("entry_text", { entry: entryId })
      ) ?? [])[0] ?? null,
    queryKey: [...pipelineKey, "entry-text", entryId],
  });
  const images = useQuery({
    enabled: pledged,
    queryFn: () =>
      callApi<{ images: MarkedImage[] }>(supabase, "/files/blind", {
        entry: entryId,
      }),
    queryKey: [...pipelineKey, "entry-images", entryId],
  });

  if (pledge.isPending) {
    return <SectionSpinner />;
  }
  if (!pledged) {
    return <Pledge />;
  }
  if (text.isPending) {
    return <SectionSpinner />;
  }
  const work = text.data;
  const mark = [work?.mark, formatLongDate(new Date().toISOString(), locale)]
    .filter(Boolean)
    .join(" · ");
  const lang = language === "ar" ? "ar" : undefined;
  return (
    <section className="grid gap-3">
      <h2 className="type-subheading">{t("entry.text")}</h2>
      <p className="type-caption">{t("room.note")}</p>
      <Protected mark={mark}>
        <TextView html={work?.body_html ?? null} lang={lang} />
        {work?.source_text ? (
          <>
            <h3 className="font-medium">{t("submission.source")}</h3>
            <p className="whitespace-pre-wrap" lang={lang}>
              {work.source_text}
            </p>
          </>
        ) : null}
        {(images.data?.images ?? []).map((image, index) =>
          image.src ? (
            // biome-ignore lint/performance/noImgElement: a marked copy sent inline, never a file address
            <img
              alt={t("room.image", { number: String(index + 1) })}
              className="h-auto w-full"
              draggable={false}
              height={image.height}
              key={image.key}
              src={image.src}
              width={image.width}
            />
          ) : (
            <p className="type-caption" key={image.key}>
              {t("room.imageUnavailable")}
            </p>
          )
        )}
      </Protected>
      {work?.body_html || images.data?.images.length ? null : (
        <p className="type-caption">{t("entry.noText")}</p>
      )}
      <ErrorLine error={text.error ?? images.error} />
    </section>
  );
};
