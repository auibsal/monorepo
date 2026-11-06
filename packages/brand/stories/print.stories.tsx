import { Icon } from "@repo/brand/components/sal/icon";
import type { Meta, StoryObj } from "@storybook/react";
import type { ReactNode } from "react";
import QRCode from "react-qr-code";

/**
 * Print (SAL-PRT-01, packages/brand/assets/print): the Charter poster, the
 * Open Call poster and the camera-shy stickers drawn here at their printed
 * size, the rest of the printables as one HTML page, and the sizes each
 * piece is printed at (Notion, Brand essentials). No PDFs: print a story
 * from the browser. Print only when current stock runs out.
 */
const meta = {
  title: "Print",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const HTML = "brand-kit/print/sal-prt-01-printables.html";

export const Printables: Story = {
  render: () => (
    <div className="grid max-w-5xl gap-4">
      <p className="text-sm">
        The one-pager, Get involved, the Term Cards, membership cards,
        certificates (Service, Fellow, the Qirtas Awards, the Apprenticeship,
        Honorary Fellow), the Register's half-sheet, name badges and the
        photography notice.{" "}
        <a className="underline" href={HTML}>
          Open the HTML
        </a>
      </p>
      <iframe
        className="h-[80vh] w-full border border-line bg-white"
        src={HTML}
        title="SAL-PRT-01 Printables"
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

/** The Charter poster, A3: the Charter's purpose, pillars and values. */
export const CharterPoster: Story = {
  render: () => (
    <Sheet height="420mm" width="297mm">
      <div className="absolute start-[30mm] top-[27mm]">
        {/* biome-ignore lint/performance/noImgElement: the logo file as supplied */}
        <img
          alt="AUIB Society of Arts and Letters"
          className="block h-[29mm] w-auto"
          height={110}
          src="brand/sal-lockup-horizontal.svg"
          width={400}
        />
      </div>
      <p className="absolute inset-x-[30mm] top-[120mm] font-light text-[76pt] leading-none tracking-[-0.03em]">
        The paper and
        <br />
        the <i className="text-[#9c213e]">pen.</i>
      </p>
      <div className="absolute inset-x-[30mm] top-[200mm] grid grid-cols-2 gap-[17mm] border-[#273236] border-t-[0.6pt] pt-[11mm]">
        <div>
          <p className={label}>We exist</p>
          <p className="mt-[3mm] font-light text-[21pt] leading-[1.4]">
            To cultivate a culture of literature and creative expression across
            AUIB.
          </p>
          <p className={`${label} mt-[11mm]`}>Our pillars</p>
          <p className="mt-[3mm] text-[16pt] leading-[1.7]">
            Connecting students
            <br />
            Fostering creativity
            <br />
            Celebrating culture
            <br />
            Building a community
          </p>
        </div>
        <div>
          <p className={label}>Our values</p>
          <p className="mt-[3mm] text-[16pt] leading-[1.7]">
            Open door. Free, for every student.
            <br />
            Craft. Serious, even when fun.
            <br />
            Two languages, equal care.
            <br />
            Care. Consent before cameras.
            <br />
            Needs, not money.
            <br />
            Built to last.
          </p>
        </div>
      </div>
      <div className="absolute inset-x-[30mm] bottom-[27mm] flex items-end justify-between text-[11pt]">
        <span>Ratified on Charter Day, Tuesday, October 13, 2026</span>
        <span>@auibsal</span>
      </div>
    </Sheet>
  ),
};

/**
 * The Open Call poster, A3 (or A4 at 71%): the Edition's call, in the copy
 * of the Instagram post, with a QR to auibsal.org/qirtas/write.
 */
export const OpenCallPoster: Story = {
  render: () => (
    <Sheet height="420mm" width="297mm">
      <div className="absolute start-[30mm] top-[27mm]">
        {/* biome-ignore lint/performance/noImgElement: the logo file as supplied */}
        <img
          alt="The Bookmark"
          className="block h-[34mm] w-auto"
          height={130}
          src="brand/sal-symbol.svg"
          width={80}
        />
      </div>
      <p className="absolute inset-x-[30mm] top-[120mm] font-light text-[96pt] leading-none tracking-[-0.03em]">
        Write for
        <br />
        <i className="text-[#9c213e]">Qirtas.</i>
      </p>
      <div className="absolute inset-x-[30mm] top-[245mm] border-[#273236] border-t-[0.6pt] pt-[11mm]">
        <p className="max-w-[180mm] font-light text-[24pt] leading-[1.4]">
          Poems, stories, essays, art and photography for Edition 1, printed
          this spring.
        </p>
        <p className="mt-[8mm] text-[16pt]">Until Thursday, December 3</p>
      </div>
      <div className="absolute inset-x-[30mm] bottom-[27mm] flex items-end justify-between text-[11pt]">
        <span>auibsal.org · @auibsal</span>
        <QRCode
          bgColor="#ffffff"
          fgColor="#273236"
          size={150}
          title="auibsal.org/qirtas/write"
          value="https://auibsal.org/qirtas/write"
        />
      </div>
    </Sheet>
  ),
};

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

const SIZES: [string, string][] = [
  ["Charter poster", "A3"],
  ["Open Call poster", "A3 or A4"],
  ["Term Card", "A6, four to an A4 sheet"],
  ["Membership card", "85 × 55 mm, 300 gsm, ten to an A4 sheet"],
  ["Certificate of Service (F-28)", "A4 landscape"],
  ["Fellow certificate", "A4 landscape"],
  ["Name badges", "90 × 55 mm"],
  ["Photography notice", "A4"],
  ["Camera-shy stickers", "40 mm round, twenty to an A4 sheet"],
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
