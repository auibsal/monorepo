import type { Meta, StoryObj } from "@storybook/react";

/**
 * The social files, ready to post (packages/brand/assets/social): each is
 * an HTML template rendered to PNG at its size. To make a new one, copy
 * the template, change the words and render it again (Social/Templates
 * shows the parts).
 */
const meta = {
  title: "Social/Downloads",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

interface Item {
  file: string;
  name: string;
}

const Downloads = ({
  dir,
  items,
  size,
}: {
  dir: string;
  items: Item[];
  size: string;
}) => (
  <div className="grid max-w-5xl gap-4">
    <p className="text-sm text-text-secondary">{size}</p>
    <ul className="grid grid-cols-2 gap-6 md:grid-cols-3">
      {items.map(({ file, name }) => (
        <li className="border-line border-t pt-3" key={file}>
          {/* biome-ignore lint/performance/noImgElement: the rendered PNG, as posted */}
          <img
            alt={name}
            className="w-full border border-line"
            height={400}
            loading="lazy"
            src={`brand-kit/social/${dir}/${file}.png`}
            width={400}
          />
          <p className="mt-2 text-sm">
            {name}{" "}
            <a
              className="text-text-secondary underline"
              download
              href={`brand-kit/social/${dir}/${file}.png`}
            >
              PNG
            </a>{" "}
            <a
              className="text-text-secondary underline"
              href={`brand-kit/social/${dir}/${file}.html`}
            >
              Template
            </a>
          </p>
        </li>
      ))}
    </ul>
  </div>
);

const HIGHLIGHTS: Item[] = [
  { file: "1-whats-on", name: "What's on" },
  { file: "2-qirtas", name: "Qirtas" },
  { file: "3-the-company", name: "The Company" },
  { file: "4-next-stop", name: "Next Stop" },
  { file: "5-join", name: "Join" },
  { file: "6-partners", name: "Partners" },
];

export const Posts: Story = {
  render: () => (
    <Downloads
      dir="posts"
      items={[
        { file: "1-qirtas-edition-call", name: "Qirtas: the Edition's call" },
        { file: "2-second-chapter", name: "Second Chapter" },
        { file: "3-tuesdays", name: "Tuesdays" },
        { file: "4-come-in", name: "Come in" },
        { file: "5-get-involved", name: "Get involved" },
      ]}
      size="Posts, 1080 × 1350."
    />
  ),
};

export const HighlightCovers: Story = {
  name: "Highlight covers",
  render: () => (
    <Downloads
      dir="highlights"
      items={HIGHLIGHTS}
      size="The six highlight covers, in order, 1080 × 1080."
    />
  ),
};

export const StoryBanners: Story = {
  name: "Story banners",
  render: () => (
    <Downloads
      dir="stories"
      items={HIGHLIGHTS}
      size="The banner that opens each highlight, 1080 × 1920."
    />
  ),
};

export const Avatars: Story = {
  render: () => (
    <Downloads
      dir="avatars"
      items={[
        { file: "avatar-crimson", name: "Instagram and the members' group" },
        { file: "avatar-ink", name: "The Diwan group" },
      ]}
      size="Profile pictures, 1080 × 1080. Hudhud, the bot, keeps the hoopoe."
    />
  ),
};
