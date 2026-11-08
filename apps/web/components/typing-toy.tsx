"use client";

import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";

const WORDS = /\S+/gu;
const SIX = 6;

/**
 * A typewriter to try on the Typewriter Tour's page (the design review
 * A30, Nov 4, 2026): six words in Ubuntu Mono, kept nowhere (no storage,
 * no request) and gone on reload. The keys sound only if the visitor
 * turns the sound on; it starts off.
 */
export const TypingToy = () => {
  const t = useTranslations("web.tour.toy");
  const id = useId();
  const [text, setText] = useState("");
  const [sound, setSound] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const count = text.match(WORDS)?.length ?? 0;

  /** A short click, like a typebar striking: a burst of decaying noise. */
  const strike = () => {
    if (!sound) {
      return;
    }
    audio.current ??= new AudioContext();
    const context = audio.current;
    const length = Math.floor(context.sampleRate * 0.03);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
    }
    const source = context.createBufferSource();
    const gain = context.createGain();
    gain.gain.value = 0.25;
    source.buffer = buffer;
    source.connect(gain).connect(context.destination);
    source.start();
  };

  return (
    <div className="grid max-w-2xl gap-3">
      <label className="type-body" htmlFor={id}>
        {t("label")}
      </label>
      <textarea
        autoComplete="off"
        className="border-line bg-surface-reading py-space-4 focus-visible:border-text min-h-32 w-full resize-y border-t border-b px-0 font-mono text-xl leading-relaxed outline-none"
        dir="auto"
        id={id}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={strike}
        spellCheck={false}
        value={text}
      />
      <p aria-live="polite" className="type-caption text-text-secondary">
        {count === SIX
          ? t("six")
          : t("count", { count: String(count), six: String(SIX) })}
      </p>
      <p className="flex flex-wrap gap-x-5 gap-y-2">
        <button
          aria-pressed={sound}
          className="link type-caption"
          onClick={() => setSound((on) => !on)}
          type="button"
        >
          {sound ? t("soundOn") : t("soundOff")}
        </button>
        <button
          className="link type-caption"
          disabled={text === ""}
          onClick={() => setText("")}
          type="button"
        >
          {t("clear")}
        </button>
      </p>
      <p className="type-caption text-text-secondary">{t("nothingKept")}</p>
    </div>
  );
};
