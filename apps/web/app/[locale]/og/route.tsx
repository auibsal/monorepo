import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// The brand's post on the white ground (brand/components/previews/
// SocialPost.md), at the Open Graph size: the lockup in the page's language
// at the top start, a Light headline in ink with nothing above it, and the
// link and @auibsal at the bottom start. One language per image. Colors from
// brand/tokens.json; logos as supplied. assets-og/ holds Ubuntu Light (Latin)
// and Ubuntu Arabic with its Extension lookups rewritten as direct ones
// (Satori cannot read type 7).
const WHITE = "#ffffff";
const INK = "#273236";
const ASH = "#5c6568";

const SIZE = { height: 630, width: 1200 };
const WHITESPACE = /\s+/;

/** Words with their position in the text (a stable key). */
const wordsOf = (text: string) => {
  let at = 0;
  return text.split(WHITESPACE).map((word) => {
    const entry = { at, word };
    at += word.length + 1;
    return entry;
  });
};

const asset = (name: string) =>
  readFile(join(process.cwd(), "assets-og", name));

const NAME = {
  ar: "جمعية الفنون والآداب",
  en: "AUIB Society of Arts and Letters",
} as const;

/**
 * Satori lays words out left to right whatever the direction, so an Arabic
 * line is drawn as its words in a reversed, wrapping row starting at the
 * right. Letters within a word are shaped by the font as usual.
 */
const Line = ({
  rtl,
  style,
  text,
}: {
  rtl: boolean;
  style: Record<string, string | number>;
  text: string;
}) =>
  rtl ? (
    <div
      style={{
        ...style,
        columnGap: "0.12em",
        display: "flex",
        flexDirection: "row-reverse",
        flexWrap: "wrap",
      }}
    >
      {wordsOf(text).map(({ at, word }) => (
        <span key={at}>{word}</span>
      ))}
    </div>
  ) : (
    <div style={{ ...style, display: "flex" }}>{text}</div>
  );

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ locale: string }> }
) => {
  const { locale } = await params;
  const lang = locale === "ar" ? "ar" : "en";
  const rtl = lang === "ar";
  const search = new URL(request.url).searchParams;
  const title = (search.get("title") ?? NAME[lang]).slice(0, 120);
  const [light, arabic, lockup] = await Promise.all([
    asset("Ubuntu-Light.ttf"),
    asset("UbuntuArabic-Regular.ttf"),
    asset(rtl ? "sal-lockup-horizontal-ar.svg" : "sal-lockup-horizontal.svg"),
  ]);
  const lockupSrc = `data:image/svg+xml;base64,${lockup.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        alignItems: rtl ? "flex-end" : "flex-start",
        background: WHITE,
        color: INK,
        display: "flex",
        flexDirection: "column",
        fontFamily: rtl ? "Ubuntu Arabic" : "Ubuntu",
        height: "100%",
        justifyContent: "space-between",
        padding: "56px 72px",
        width: "100%",
      }}
    >
      {/* biome-ignore lint/performance/noImgElement: Satori renders plain img */}
      <img
        alt={NAME[lang]}
        height={96}
        src={lockupSrc}
        width={rtl ? 184 : 192}
      />
      <Line
        rtl={rtl}
        style={{
          color: INK,
          fontSize: title.length > 60 ? 60 : 76,
          fontWeight: rtl ? 400 : 300,
          letterSpacing: rtl ? 0 : "-0.03em",
          lineHeight: rtl ? 1.3 : 1.05,
        }}
        text={title}
      />
      <div style={{ color: ASH, display: "flex", fontSize: 26 }}>
        auibsal.org · @auibsal
      </div>
    </div>,
    {
      ...SIZE,
      fonts: [
        { data: light, name: "Ubuntu", style: "normal", weight: 300 },
        { data: arabic, name: "Ubuntu Arabic", style: "normal", weight: 400 },
      ],
      headers: { "Cache-Control": "public, max-age=86400, immutable" },
    }
  );
};
