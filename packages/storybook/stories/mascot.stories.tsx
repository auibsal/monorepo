import { SalCard } from "@repo/design-system/components/sal/card";
import type { Meta, StoryObj } from "@storybook/react";
import Image from "next/image";

/**
 * Hudhud (هدهد), the hoopoe who carries the Society's letters: the face of
 * the Telegram bot. Files and rules in brand/mascot/README.md.
 */
const meta = {
  title: "SAL/Mascot",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const parts = [
  ["Body and head", "crimson-100, outlined in ink"],
  ["Crest", "crimson, a white band, ink tips"],
  ["Wings and tail", "ink with white bars"],
  ["Beak and legs", "ink-70"],
  ["The letter", "the SAL symbol in white, outlined in ink"],
];

export const Hudhud: Story = {
  render: () => (
    <div className="grid max-w-3xl gap-6">
      <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
        <Image
          alt="Hudhud, a hoopoe carrying the Society's letter in its beak"
          className="w-full max-w-md"
          height={390}
          src="/mascot/hudhud.svg"
          unoptimized
          width={460}
        />
        <Image
          alt="Hudhud in a circle, as the bot's Telegram avatar"
          className="size-40 rounded-full"
          height={160}
          src="/mascot/hudhud-avatar.svg"
          unoptimized
          width={160}
        />
      </div>
      <SalCard>
        <h2 className="type-heading">Hudhud · هدهد</h2>
        <p className="type-body">
          A hoopoe: native to Iraq, the messenger of the old stories and the
          guide in Attar&apos;s The Conference of the Birds. For the Society it
          carries the letters, so it holds the SAL symbol in its beak.
        </p>
      </SalCard>
      <dl className="grid gap-2">
        {parts.map(([part, color]) => (
          <div className="grid grid-cols-[10rem_1fr] gap-4" key={part}>
            <dt className="type-caption">{part}</dt>
            <dd className="type-body">{color}</dd>
          </div>
        ))}
      </dl>
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
        Warm, brief, literate. No exclamation marks, no emoji.
      </p>
    </div>
  ),
};
