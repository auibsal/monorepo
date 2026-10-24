import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { siteUrl } from "@repo/internationalization";

// Brand colors (brand/tokens.json, v6). Email clients need inline styles.
const CRIMSON = "#9c213e";
const INK = "#273236";
const ASH = "#5c6568";
const STONE = "#e2ddd6";
const WHITE = "#ffffff";

/** The horizontal lockup as supplied, rasterized for mail clients. */
const LOCKUP = siteUrl("en", "/brand/sal-lockup-horizontal-email.png");

const FONT = "'Ubuntu Arabic', Ubuntu, 'Segoe UI', Tahoma, Arial, sans-serif";

export interface NoticeBlock {
  readonly action?: { readonly href: string; readonly label: string };
  readonly heading: string;
  readonly lang: "en" | "ar";
  readonly paragraphs: readonly string[];
}

export interface NoticeProps {
  /** The recipient's language first, then the other one. */
  readonly blocks: readonly NoticeBlock[];
  readonly preview: string;
}

const NAME = {
  ar: "جمعية الفنون والآداب",
  en: "AUIB Society of Arts and Letters",
};

const FOOTER = {
  ar: "رسالة من الديوان، منصة جمعية الفنون والآداب في الجامعة الأمريكية في العراق – بغداد.",
  en: "Sent by the Diwan, the platform of the AUIB Society of Arts and Letters.",
};

const Block = ({ block }: { block: NoticeBlock }) => {
  const rtl = block.lang === "ar";
  const text = {
    color: INK,
    direction: rtl ? ("rtl" as const) : ("ltr" as const),
    fontFamily: FONT,
    fontSize: rtl ? 17 : 16,
    lineHeight: rtl ? 1.9 : 1.6,
    margin: "0 0 12px",
    textAlign: rtl ? ("right" as const) : ("left" as const),
  };
  return (
    <Section dir={rtl ? "rtl" : "ltr"} lang={block.lang}>
      <Text
        style={{
          ...text,
          color: INK,
          fontSize: rtl ? 30 : 32,
          fontWeight: rtl ? 400 : 300,
          letterSpacing: rtl ? 0 : "-0.02em",
          lineHeight: rtl ? 1.5 : 1.15,
          margin: "0 0 20px",
        }}
      >
        {block.heading}
      </Text>
      {block.paragraphs.map((paragraph) => (
        <Text key={paragraph} style={text}>
          {paragraph}
        </Text>
      ))}
      {block.action ? (
        <Section style={{ textAlign: rtl ? "right" : "left" }}>
          <Button
            href={block.action.href}
            style={{
              backgroundColor: CRIMSON,
              borderRadius: 0,
              color: WHITE,
              display: "inline-block",
              fontFamily: FONT,
              fontSize: 15,
              fontWeight: 500,
              padding: "14px 24px",
              textDecoration: "none",
            }}
          >
            {block.action.label}
          </Button>
        </Section>
      ) : null}
    </Section>
  );
};

/**
 * Every notice the platform sends (v6): white, the horizontal lockup, a
 * Light headline, the message in the recipient's language and then the
 * other, one crimson button per language and a hairline footer. No other
 * images, no tracking, no exclamation marks.
 */
export const Notice = ({ blocks, preview }: NoticeProps) => {
  const first = blocks[0]?.lang ?? "en";
  return (
    <Html dir={first === "ar" ? "rtl" : "ltr"} lang={first}>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: WHITE, margin: 0, padding: "24px 0" }}>
        <Container style={{ maxWidth: 600, padding: "8px 32px 32px" }}>
          <Img
            alt={NAME[first]}
            height={48}
            src={LOCKUP}
            style={{ margin: "0 0 40px" }}
            width={96}
          />
          {blocks.map((block, index) => (
            <Section key={block.lang}>
              {index > 0 ? (
                <Hr style={{ borderColor: STONE, margin: "32px 0" }} />
              ) : null}
              <Block block={block} />
            </Section>
          ))}
          <Hr style={{ borderColor: STONE, margin: "40px 0 16px" }} />
          {blocks.map((block) => (
            <Text
              key={`footer-${block.lang}`}
              lang={block.lang}
              style={{
                color: ASH,
                direction: block.lang === "ar" ? "rtl" : "ltr",
                fontFamily: FONT,
                fontSize: 12,
                lineHeight: 1.6,
                margin: "0 0 4px",
                textAlign: block.lang === "ar" ? "right" : "left",
              }}
            >
              {FOOTER[block.lang]}
            </Text>
          ))}
        </Container>
      </Body>
    </Html>
  );
};

Notice.PreviewProps = {
  blocks: [
    {
      action: { href: "https://auibsal.org/diwan", label: "Open the Diwan" },
      heading: "You're booked for the Majlis",
      lang: "en",
      paragraphs: ["Tuesday, October 13 · 6:00 PM", "Library, second floor"],
    },
    {
      action: { href: "https://auibsal.org/ar/diwan", label: "افتح الديوان" },
      heading: "حُجز مكانك في المجلس",
      lang: "ar",
      paragraphs: ["الثلاثاء، 13 تشرين الأول · 6:00 مساءً"],
    },
  ],
  preview: "You're booked for the Majlis",
} satisfies NoticeProps;

// biome-ignore lint/complexity/noRedundantDefaultExport: React Email's preview server loads templates through their default export.
export default Notice;
