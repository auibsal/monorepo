import { SalCard } from "@repo/design-system/components/sal/card";
import type { Meta, StoryObj } from "@storybook/react";
import Image from "next/image";

/**
 * Hudhud (هدهد), the hoopoe: the face of the Telegram bot. Files and rules
 * in brand/mascot/README.md; the files are used as supplied, never redrawn.
 */
const meta = {
  title: "SAL/Mascot",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Hudhud: Story = {
  render: () => (
    <div className="grid max-w-4xl gap-8">
      <div className="grid items-end gap-6 sm:grid-cols-3">
        <figure className="grid gap-2">
          <Image
            alt="Hudhud standing"
            className="w-full"
            height={1000}
            src="/mascot/hudhud.svg"
            unoptimized
            width={1180}
          />
          <figcaption className="type-caption">
            Standing, light grounds
          </figcaption>
        </figure>
        <figure className="grid gap-2" data-theme="light">
          <div className="band p-4">
            <Image
              alt="Hudhud standing, reversed on crimson"
              className="w-full"
              height={1000}
              src="/mascot/hudhud-reversed.svg"
              unoptimized
              width={1180}
            />
          </div>
          <figcaption className="type-caption">Reversed, on crimson</figcaption>
        </figure>
        <figure className="grid gap-2">
          <Image
            alt="Hudhud in flight"
            className="w-full"
            height={1000}
            src="/mascot/hudhud-flying.svg"
            unoptimized
            width={1180}
          />
          <figcaption className="type-caption">
            Flying: sent, on its way
          </figcaption>
        </figure>
      </div>
      <div className="grid gap-3">
        <p className="type-label">The bot's avatar at 96, 48 and 28 px</p>
        <div className="flex items-end gap-6">
          {[96, 48, 28].map((size) => (
            <Image
              alt={`Hudhud's avatar at ${size} pixels`}
              className="rounded-full"
              height={size}
              key={size}
              src="/mascot/hudhud-avatar.svg"
              unoptimized
              width={size}
            />
          ))}
        </div>
      </div>
      <SalCard>
        <h2 className="type-heading">Hudhud · هدهد</h2>
        <p className="type-body text-text-secondary">
          A hoopoe: native to Iraq, the messenger of the old stories and the
          guide in Attar&apos;s The Conference of the Birds. Flat shapes in
          brand colors only; never recolored, stretched, mirrored or given the
          Society&apos;s symbol.
        </p>
      </SalCard>
    </div>
  ),
};

const STICKERS = [
  ["01-hello", "Hello, welcome"],
  ["02-youre-in", "You're in, RSVP confirmed"],
  ["03-reading", "Reading, the paper is out"],
  ["04-thinking", "Thinking, let me check"],
  ["05-asleep", "Nothing new, quiet week"],
  ["06-sent", "Sent, on its way"],
  ["07-sorry", "Sorry, something went wrong"],
  ["08-thank-you", "Thank you"],
  ["09-writing", "Writing, submissions open"],
  ["10-wow", "Wow, big news"],
  ["11-see-you", "See you there"],
  ["12-oops", "Oops, a reminder or deadline"],
] as const;

const StickerGrid = () => (
  <ul className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
    {STICKERS.map(([file, meaning]) => (
      <li className="grid gap-1" key={file}>
        <Image
          alt={meaning}
          height={512}
          src={`/mascot/stickers/png/${file}.png`}
          unoptimized
          width={512}
        />
        <span className="type-caption text-text-secondary">{meaning}</span>
      </li>
    ))}
  </ul>
);

/** All twelve stickers on a light and a dark ground: chat only. */
export const Stickers: Story = {
  render: () => (
    <div className="grid gap-6">
      <section className="bg-surface p-6 text-text" data-theme="light">
        <StickerGrid />
      </section>
      <section className="bg-surface p-6 text-text" data-theme="dark">
        <StickerGrid />
      </section>
    </div>
  ),
};

export const Voice: Story = {
  render: () => (
    <div className="grid max-w-2xl gap-4">
      <SalCard>
        <p className="type-body">
          Hello. I&apos;m Hudhud, the messenger of the AUIB Society of Arts and
          Letters.
        </p>
      </SalCard>
      <SalCard>
        <p className="type-body">
          You&apos;re in. I&apos;ll remind you before it starts.
        </p>
      </SalCard>
      <SalCard>
        <p className="type-body" lang="ar">
          حُجز مقعدك. سأذكّرك قبل أن تبدأ.
        </p>
      </SalCard>
      <p className="type-caption">
        Warm, brief, literate. No exclamation marks, no emoji in the copy; a
        sticker may follow a reply, never replace it.
      </p>
    </div>
  ),
};
