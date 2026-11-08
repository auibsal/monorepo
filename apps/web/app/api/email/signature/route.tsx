import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  guillochePaths,
  seedFromText,
} from "@repo/brand/components/sal/guilloche";
import { createAdminClient } from "@repo/database/admin";
import { formatLongDate } from "@repo/internationalization/format";
import { ImageResponse } from "next/og";
import { problem } from "@/lib/api/problem";
import { presidentSigner } from "@/lib/api/signer";
import { cardNumber, sealOf } from "@/lib/signature-seal";

const DATE = /^\d{4}-\d{2}-\d{2}$/u;
const CRIMSON = "#9c213e";
const INK = "#273236";
const ASH = "#5c6568";
const LINE = "#e2ddd6";
const FONTS = path.join(process.cwd(), "../../packages/brand/assets/fonts");

/**
 * The President's signature as an image, for letters sent by email
 * (decisions.md): the same signature the site draws (`Signature`),
 * the name in the signature face beside the rosette, with the card number,
 * the date and the seal, since mail apps can't load the face themselves.
 * Only the President's seat, read from the roles: nobody else's name can
 * be put on it. `?date=` is the day of the letter (YYYY-MM-DD).
 */
export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? "";
  if (url.searchParams.get("seat") !== "president" || !DATE.test(date)) {
    return problem(404, "not_found");
  }
  const signer = await presidentSigner(createAdminClient());
  if (!signer) {
    return problem(404, "not_found");
  }
  const [script, text] = await Promise.all([
    readFile(path.join(FONTS, "MrsSaintDelafield-Regular.ttf")),
    readFile(path.join(FONTS, "Ubuntu-Regular.ttf")),
  ]);
  const when = `${date}T12:00:00Z`;
  const seed = signer.number ?? seedFromText(signer.name);
  const caption = [
    signer.number === null ? null : `No. ${cardNumber(signer.number)}`,
    formatLongDate(when, "en"),
    sealOf(signer.name, signer.number, when),
  ].filter(Boolean);
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#ffffff",
        borderBottom: `2px solid ${LINE}`,
        borderTop: `2px solid ${LINE}`,
        display: "flex",
        height: "100%",
        padding: "0 8px",
        width: "100%",
      }}
    >
      <svg
        aria-hidden="true"
        height="128"
        style={{ marginRight: 32 }}
        viewBox="-130 -130 260 260"
        width="128"
      >
        {guillochePaths(seed).map((d) => (
          <path
            d={d}
            fill="none"
            key={d.slice(0, 24)}
            stroke={CRIMSON}
            strokeWidth={0.9}
          />
        ))}
      </svg>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            color: INK,
            fontFamily: "Signature",
            fontSize: 84,
            lineHeight: 1.1,
          }}
        >
          {signer.name}
        </div>
        <div
          style={{
            color: ASH,
            display: "flex",
            fontFamily: "Ubuntu",
            fontSize: 24,
            gap: 24,
          }}
        >
          {caption.map((part) => (
            <span key={part}>{part}</span>
          ))}
        </div>
      </div>
    </div>,
    {
      fonts: [
        { data: script, name: "Signature", style: "normal", weight: 400 },
        { data: text, name: "Ubuntu", style: "normal", weight: 400 },
      ],
      headers: { "Cache-Control": "public, max-age=86400" },
      height: 200,
      width: 960,
    }
  );
};
