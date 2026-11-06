import { Icon } from "@repo/brand/components/sal/icon";
import type { Meta, StoryObj } from "@storybook/react";
import type { ReactNode } from "react";

/**
 * Print (SAL-MED-02, packages/brand/assets/print): the camera-shy stickers
 * and the sticker pack drawn here at their printed size, the rest of the
 * printables as one HTML page, and the sizes each piece is printed at
 * (Notion, Brand essentials). Paperless by default: print from the browser,
 * only to the confirmed need (the RSVP count plus 10%, or the number asked
 * for), requested from Student Life through the General Secretary.
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
        the camera-shy stickers; the sticker pack is below. Forms, letters,
        membership cards and certificates are components (see Components →
        Brand), printed from their own pages.{" "}
        <a className="underline" href={HTML}>
          Open the HTML
        </a>
      </p>
      <iframe
        className="h-[80vh] w-full border border-line bg-white"
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
const STICKER_PACK: [string, string, string, number, number][] = [
  ["bookmark", "The Bookmark", "The Society", 56.08, 66.67],
  ["bookmark-tile", "Bookmark tile", "The Society", 55.92, 55.92],
  ["bookmark-tile-ink", "Bookmark tile, ink", "The Society", 55.92, 55.92],
  ["lockup-stacked", "Stacked lockup", "The Society", 57.92, 88.92],
  ["wordmark-ar", "Arabic wordmark", "The Society", 77.92, 78.5],
  ["bumper-bilingual", "Bilingual bumper", "The Society", 195.92, 82.75],
  ["postage-stamp", "Postage stamp", "The Society", 51.92, 61.92],
  ["postmark", "Postmark", "The Society", 59.92, 59.92],
  ["motto-en", "The paper and the pen.", "The motto", 167.92, 77.92],
  ["motto-ar", "Arabic motto", "The motto", 141.92, 49.92],
  ["motto-strip", "Motto strip", "The motto", 205.92, 35.92],
  ["the-pen", "The pen", "The motto", 33.92, 83.92],
  ["the-paper", "The paper", "The motto", 55.92, 71.92],
  ["qirtas-keys", "QIRTAS in keys", "Qirtas", 177.92, 51.92],
  ["key-qaf", "Qaf key", "Qirtas", 61.92, 61.92],
  ["qirtas-nameplate", "Qirtas nameplate", "Qirtas", 137.92, 71.92],
  ["qirtas-ar", "Qirtas in Arabic", "Qirtas", 155.92, 63.92],
  ["section-news", "News", "Qirtas", 49.92, 49.92],
  ["section-voices", "Voices", "Qirtas", 49.92, 49.92],
  ["section-letters", "Letters", "Qirtas", 49.92, 49.92],
  ["section-gallery", "Gallery", "Qirtas", 49.92, 49.92],
  ["section-video", "Video", "Qirtas", 49.92, 49.92],
  ["section-games", "Games", "Qirtas", 49.92, 49.92],
  ["read-blind", "Read blind", "Qirtas", 101.92, 47.92],
  ["the-company", "The Company", "The Company", 95.92, 69.92],
  ["icon-drama", "Drama", "The Company", 49.92, 49.92],
  ["next-stop", "Next Stop", "Next Stop", 69.92, 77.92],
  ["ticket", "What’s on ticket", "Events", 101.92, 47.92],
  ["record", "The record", "Events", 65.92, 65.92],
  ["cup", "A cup of tea", "Events", 69.92, 69.92],
  ["open-book", "An open book", "Events", 97.92, 63.92],
  ["book-stack", "A stack of books", "Events", 79.92, 47.92],
  ["icon-book-open", "Book open", "Events", 49.92, 49.92],
  ["icon-headphones", "Headphones", "Events", 49.92, 49.92],
  ["typewriter", "The typewriter", "Typewriter Tour", 86.92, 61.92],
  ["icon-keyboard", "Keyboard", "Typewriter Tour", 49.92, 49.92],
  ["second-chapter", "Second Chapter", "Second Chapter", 69.92, 69.92],
  ["hudhud", "Hudhud", "Hudhud", 69.92, 69.92],
  ["hudhud-flying", "Hudhud flying", "Hudhud", 87.92, 67.92],
  ["hudhud-reversed", "Hudhud on crimson", "Hudhud", 67.92, 62.92],
  ["join-qr", "Join", "Ways in", 55.92, 67.92],
  ["get-involved", "Get involved", "Ways in", 111.92, 35.92],
  ["camera-shy", "Camera-shy", "Ways in", 45.92, 45.92],
];

export const StickerPack: Story = {
  render: () => (
    <div className="grid gap-10 bg-[#d9d9d9] p-10">
      {[...new Set(STICKER_PACK.map(([, , family]) => family))].map(
        (family) => (
          <section className="grid gap-4" key={family}>
            <h2 className="font-light text-2xl">{family}</h2>
            <div className="flex flex-wrap items-end gap-8">
              {STICKER_PACK.filter(([, , f]) => f === family).map(
                ([id, name, , w, h]) => (
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
        )
      )}
    </div>
  ),
};

const SIZES: [string, string][] = [
  ["Membership card (on request)", "85.6 × 54 mm, from the component"],
  [
    "Certificates: Qalam, the Mutanabbi Prize",
    "A4 landscape, from the component",
  ],
  ["Letters", "A4, from the component"],
  ["Name badges", "90 × 55 mm"],
  ["Photography notice", "A4"],
  ["Camera-shy stickers", "40 mm round, twenty to an A4 sheet"],
  ["Sticker pack", "Die-cut, each at its own size (assets/print/stickers)"],
];

export const Sizes: Story = {
  render: () => (
    <table className="w-full max-w-3xl text-sm">
      <thead>
        <tr className="text-start text-text-secondary">
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
