import { Icon } from "@repo/brand/components/sal/icon";
import type { Meta, StoryObj } from "@storybook/react";
import type { ReactNode } from "react";
import stickers from "../assets/print/stickers/stickers.json";

/**
 * Print (SAL-MED-02, packages/brand/assets/print): the camera-shy stickers
 * and the sticker pack drawn here at their printed size, the rest of the
 * printables as one HTML page, and the sizes each piece is printed at
 * (Notion, Brand essentials). Paperless by default: print from the browser,
 * only to the confirmed need (the RSVP count plus 10%, or the number asked
 * for), requested from Student Life through the Secretary.
 */
const meta = {
  title: "Print",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const HTML = "brand-kit/print/printables.html";

export const Printables: Story = {
  render: () => (
    <div className="grid max-w-5xl gap-4">
      <p className="text-sm">
        What exists only on paper: name badges and the photography notice with
        the camera-shy stickers; the posters and the sticker pack are below.
        Forms and letters are components (see Components → Brand); the
        membership card and certificates are the site’s own designs. All are
        printed from their own pages; <code>bun run print</code> makes the PDFs.{" "}
        <a className="underline" href={HTML}>
          Open the HTML
        </a>
      </p>
      <iframe
        className="border-line h-[80vh] w-full border bg-white"
        sandbox="allow-modals allow-popups allow-same-origin allow-scripts"
        src={HTML}
        title="SAL-MED-02 Printables"
      />
    </div>
  ),
};

const label =
  "font-medium text-[7.6pt] text-[#7c8487] uppercase tracking-[0.12em]";

/** A sheet at its printed size, on paper whatever the theme. */
const Sheet = ({
  children,
  height,
  width,
}: {
  children: ReactNode;
  height: string;
  width: string;
}) => (
  <div className="overflow-auto">
    <section
      className="relative bg-white text-[#273236]"
      data-theme="light"
      style={{ height, width }}
    >
      {children}
    </section>
  </div>
);

/** Camera-shy stickers, 40 mm round on sticker paper, twenty to a sheet. */
export const CameraShyStickers: Story = {
  render: () => (
    <Sheet height="297mm" width="210mm">
      <p className={`${label} absolute start-[15mm] top-[15mm]`}>
        Camera-shy stickers · 40 mm round · print on sticker paper
      </p>
      <div className="absolute start-[15mm] top-[30mm] grid grid-cols-[repeat(4,40mm)] gap-[6mm]">
        {Array.from({ length: 20 }, (_, i) => i).map((i) => (
          <div
            className="flex size-[40mm] items-center justify-center rounded-full bg-[#273236] text-center text-white"
            key={i}
          >
            <Icon
              className="size-[22mm]"
              label="Camera-shy"
              name="camera-off"
            />
          </div>
        ))}
      </div>
    </Sheet>
  ),
};

/** The sticker pack: every sticker at 100%, with its cut line in magenta. */
const STICKER_PACK = stickers.map(({ family, id, name, size }) => ({
  family,
  id,
  name,
  size: [size[0] ?? 0, size[1] ?? 0] as const,
}));

export const StickerPack: Story = {
  render: () => (
    <div className="grid gap-10 bg-[#d9d9d9] p-10">
      {[...new Set(STICKER_PACK.map(({ family }) => family))].map((family) => (
        <section className="grid gap-4" key={family}>
          <h2 className="text-2xl font-light">{family}</h2>
          <div className="flex flex-wrap items-end gap-8">
            {STICKER_PACK.filter((s) => s.family === family).map(
              ({ id, name, size: [w, h] }) => (
                <figure className="m-0 grid gap-2" key={id}>
                  {/* biome-ignore lint/performance/noImgElement: the print file as supplied */}
                  <img
                    alt={name}
                    height={h * 4}
                    src={`brand-kit/print/stickers/${id}.svg`}
                    style={{ height: `${h}mm`, width: `${w}mm` }}
                    width={w * 4}
                  />
                  <figcaption className="text-xs">{name}</figcaption>
                </figure>
              )
            )}
          </div>
        </section>
      ))}
    </div>
  ),
};

const SIZES: [string, string][] = [
  ["Membership card (on request)", "85.6 × 54 mm, printed from the site"],
  [
    "Certificates: Qalam, the Mutanabbi Prize",
    "A4 landscape, printed from the site",
  ],
  ["Letters", "A4, from the component"],
  ["Name badges", "90 × 55 mm"],
  ["Photography notice", "A4"],
  ["Camera-shy stickers", "40 mm round, twenty to an A4 sheet"],
  ["Sticker pack", "Die-cut, each at its own size (assets/print/stickers)"],
  ["Posters: the Typewriter Tour (two sides), the Society", "A2"],
];

const POSTERS: [string, string, number][] = [
  ["typewriter-tour", "The Typewriter Tour", 2],
  ["typewriter-tour-ar", "The Typewriter Tour, Arabic", 2],
  ["society", "The Society", 1],
  ["society-ar", "The Society, Arabic", 1],
];

/**
 * The posters, A2, each in its English and Arabic edition: the Typewriter
 * Tour (two sides, the rules of the paperless Tour) and the Society (for club
 * fairs and notice boards). Shown at 25%; `bun run print` makes the PDFs.
 */
export const Posters: Story = {
  render: () => (
    <div className="flex flex-wrap items-start gap-8">
      {POSTERS.map(([file, name, sides]) => (
        <figure className="m-0 grid gap-2" key={file}>
          <div className="h-[149mm] w-[105mm] overflow-hidden">
            <iframe
              className="origin-top-left border-0"
              sandbox="allow-same-origin"
              src={`brand-kit/print/posters/${file}.html`}
              style={{
                height: `${594 * sides}mm`,
                transform: "scale(0.25)",
                width: "420mm",
              }}
              title={name}
            />
          </div>
          <figcaption className="text-xs">
            {name}
            {sides > 1 ? " (the front; the back follows)" : ""}{" "}
            <a
              className="underline"
              href={`brand-kit/print/posters/${file}.html`}
            >
              Open
            </a>
          </figcaption>
        </figure>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <table className="w-full max-w-3xl text-sm">
      <thead>
        <tr className="text-text-secondary text-start">
          <th className="py-2 text-start font-medium">Piece</th>
          <th className="py-2 text-start font-medium">Size</th>
        </tr>
      </thead>
      <tbody>
        {SIZES.map(([piece, size]) => (
          <tr className="border-line border-t" key={piece}>
            <td className="py-3">{piece}</td>
            <td className="py-3">{size}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
};
