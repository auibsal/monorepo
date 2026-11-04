import type { Meta, StoryObj } from "@storybook/react";

/**
 * The logo files (packages/brand/assets/logos), used exactly as supplied,
 * each on the ground it is made for, with its download. The rules are in
 * Guide → Brand book ("The symbol, wordmarks and lockups").
 */
const meta = {
  title: "Logos",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

interface Logo {
  file: string;
  note: string;
}

const Tile = ({ file, note }: Logo) => {
  const reversed = file.includes("reversed") || file.includes("white");
  return (
    <li className="border-line border-t pt-4">
      <div
        className={`flex h-48 items-center justify-center p-6 ${reversed ? "bg-[#273236]" : "bg-white"}`}
        data-theme="light"
      >
        {/* biome-ignore lint/performance/noImgElement: the logo file as supplied */}
        <img
          alt=""
          className="max-h-full max-w-full"
          height={120}
          src={`brand/${file}`}
          width={240}
        />
      </div>
      <p className="mt-3 font-mono text-sm">{file}</p>
      <p className="text-sm text-text-secondary">
        {note}{" "}
        <a className="underline" download href={`brand/${file}`}>
          Download SVG
        </a>
      </p>
    </li>
  );
};

const Grid = ({ logos }: { logos: Logo[] }) => (
  <ul className="grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
    {logos.map((l) => (
      <Tile key={l.file} {...l} />
    ))}
  </ul>
);

export const Lockups: Story = {
  render: () => (
    <Grid
      logos={[
        { file: "sal-lockup-horizontal.svg", note: "English. The default." },
        {
          file: "sal-lockup-horizontal-reversed.svg",
          note: "English, on crimson or ink.",
        },
        {
          file: "sal-lockup-horizontal-ar.svg",
          note: "Arabic, symbol on the right.",
        },
        {
          file: "sal-lockup-horizontal-ar-reversed.svg",
          note: "Arabic, on crimson or ink.",
        },
        {
          file: "sal-lockup-stacked.svg",
          note: "Square spaces and merchandise.",
        },
        {
          file: "sal-lockup-stacked-reversed.svg",
          note: "Stacked, on crimson or ink.",
        },
        {
          file: "sal-lockup-bilingual.svg",
          note: "Permanent signage, banners and merchandise only.",
        },
        {
          file: "sal-lockup-bilingual-reversed.svg",
          note: "Bilingual, on crimson or ink.",
        },
      ]}
    />
  ),
};

export const SymbolAndWordmarks: Story = {
  name: "Symbol and wordmarks",
  render: () => (
    <Grid
      logos={[
        {
          file: "sal-symbol.svg",
          note: "The Bookmark: favicons, stamps, badges.",
        },
        {
          file: "sal-symbol-white.svg",
          note: "The Bookmark, on crimson or ink.",
        },
        { file: "sal-wordmark-en.svg", note: "English wordmark." },
        {
          file: "sal-wordmark-en-reversed.svg",
          note: "English wordmark, reversed.",
        },
        { file: "sal-wordmark-ar.svg", note: "Arabic wordmark." },
        {
          file: "sal-wordmark-ar-reversed.svg",
          note: "Arabic wordmark, reversed.",
        },
      ]}
    />
  ),
};

export const Avatars: Story = {
  render: () => (
    <Grid
      logos={[
        {
          file: "sal-avatar.svg",
          note: "Instagram and the members' Telegram group.",
        },
        {
          file: "sal-avatar-ink.svg",
          note: "The Diwan group, the officers' working group.",
        },
      ]}
    />
  ),
};
