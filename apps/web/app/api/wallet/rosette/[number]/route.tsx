import { ImageResponse } from "next/og";
import { guillochePaths } from "@/components/guilloche";

const NUMBER = /^[0-9]{1,7}$/;
const PAPER = "#f5f2ee";
const ASH = "#5c6568";

/**
 * A card's rosette as the Google Wallet pass's banner (1032 × 336, the
 * size Wallet asks for): the same pattern the card and its check page
 * draw from the card number. The number reveals nothing about the member.
 */
export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ number: string }> }
) => {
  const { number } = await params;
  if (!NUMBER.test(number)) {
    return new Response("Not found", { status: 404 });
  }
  const paths = guillochePaths(Number(number));
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: PAPER,
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <svg
        aria-hidden="true"
        height="336"
        viewBox="-130 -130 260 260"
        width="336"
      >
        {paths.map((d) => (
          <path
            d={d}
            fill="none"
            key={d.slice(0, 24)}
            stroke={ASH}
            strokeWidth={0.45}
          />
        ))}
      </svg>
    </div>,
    {
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
      height: 336,
      width: 1032,
    }
  );
};
