import type { Meta, StoryObj } from "@storybook/react";

/**
 * Print (SAL-PRT-01, packages/brand/assets/print): the printables as one
 * HTML file and its PDF, and the sizes each piece is printed at (Notion,
 * Brand essentials). Print only when current stock runs out.
 */
const meta = {
  title: "Print",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const PDF = "brand-kit/print/sal-prt-01-printables.pdf";
const HTML = "brand-kit/print/sal-prt-01-printables.html";

export const Printables: Story = {
  render: () => (
    <div className="grid max-w-5xl gap-4">
      <p className="text-sm">
        The one-pager, Get involved, the Term Cards, membership cards,
        certificates (Service, Fellow, the Qirtas Awards, the Apprenticeship,
        Honorary Fellow), the Register's half-sheet, name badges and the
        photography notice.{" "}
        <a className="underline" download href={PDF}>
          Download PDF
        </a>{" "}
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

const SIZES: [string, string][] = [
  ["Charter poster", "A3"],
  ["Open Call poster", "A3 or A4"],
  ["Term Card", "A6, four to an A4 sheet"],
  ["Membership card", "85 × 55 mm, 300 gsm, ten to an A4 sheet"],
  ["Certificate of Service (F-28)", "A4 landscape"],
  ["Fellow certificate", "A4 landscape"],
  ["Name badges", "90 × 55 mm"],
  ["Photography notice", "A4"],
  ["Camera-shy stickers", "40 mm round"],
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
