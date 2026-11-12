import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { siteUrl } from "@repo/internationalization";

// Brand colors (packages/brand/assets/tokens.json). Email clients need inline styles.
const CRIMSON = "#9c213e";
const INK = "#273236";
const ASH = "#5c6568";
const STONE = "#e2ddd6";
const WHITE = "#ffffff";

/** The horizontal lockup as supplied, rasterized for mail clients. */
// The lockup in the email's language (PNG: email clients block SVG).
const LOCKUP = {
  ar: siteUrl("en", "/brand/sal-lockup-horizontal-ar-email.png"),
  en: siteUrl("en", "/brand/sal-lockup-horizontal-email.png"),
};

const FONT = "Ubuntu, 'Segoe UI', Tahoma, Arial, sans-serif";

/** A line in a list: a title that links, and what it is (a date, a section). */
interface NoticeItem {
  readonly href?: string;
  readonly meta?: string;
  readonly title: string;
}

/** A titled list of links (the Sunday Paper's pieces, a digest's replies). */
export interface NoticeList {
  readonly items: readonly NoticeItem[];
  readonly title: string;
}

export interface NoticeBlock {
  readonly action?: {
    /** Repeat the address under the button, for clients that block it. */
    readonly fallback?: boolean;
    readonly href: string;
    readonly label: string;
  };
  readonly heading: string;
  readonly lang: "en" | "ar";
  readonly lists?: readonly NoticeList[];
  readonly paragraphs: readonly string[];
  /** A letter's close: "Warmly," then the signer's signature, name and seat. */
  readonly signoff?: NoticeSignoff;
}

/** Who signs a letter sent by email, and their signature as an image. */
export interface NoticeSignoff {
  readonly closing: string;
  /** The signature (`/api/email/signature`), 480 × 100 as shown. */
  readonly image?: string;
  readonly name: string;
  readonly title: string;
}

/** A line above the sign-off: why this came, and how to change it. */
export interface NoticeFooterLine {
  readonly href?: string;
  readonly link?: string;
  readonly text: string;
}

export interface NoticeProps {
  /** The recipient's language first, then the other one. */
  readonly blocks: readonly NoticeBlock[];
  /**
   * Bulk mail's web copy (decisions.md, Channels and email): "View in your
   * browser" at the top, for the Sunday Paper and announcements.
   */
  readonly browser?: string;
  readonly footer?: readonly NoticeFooterLine[];
  readonly preview: string;
}

const FALLBACK = {
  ar: "إن لم يعمل الزر، فافتح هذا الرابط:",
  en: "If the button doesn't work, open this link:",
};

const IN_BROWSER = {
  ar: "اقرأها في المتصفح",
  en: "View in your browser",
};

const NAME = {
  ar: "جمعية الفنون والآداب",
  en: "AUIB Society of Arts and Letters",
};

/**
 * The foot of every email: who sent it, the sustainability line and the
 * Society's postal address (decisions §6, Email: bulk mail carries it, as
 * CAN-SPAM asks; every email carries the same foot).
 */
const FOOTER = {
  ar: "أُرسلت من موقع جمعية الفنون والآداب في الجامعة الأمريكية، auibsal.org. الأصل عندنا: بلا ورق. والكتب يُعاد استخدامها عبر «الفصل الثاني». جمعية الفنون والآداب في الجامعة الأمريكية، بعناية مكتب شؤون الطلبة، الجامعة الأمريكية في بغداد، طريق المطار، بغداد، العراق.",
  en: "Sent by the website of the AUIB Society of Arts and Letters, auibsal.org. Paperless by default. Books reused through Second Chapter. AUIB Society of Arts and Letters, c/o Office of Student Life, American University of Iraq – Baghdad, Airport Road, Baghdad, Iraq.",
};

/**
 * The same notice as plain text, sent beside the HTML: some mail apps and
 * every screen reader in plain-text mode read this one, and spam filters
 * trust a message more when both parts say the same.
 */
export const noticeText = ({
  blocks,
  browser,
  footer = [],
}: Pick<NoticeProps, "blocks" | "browser" | "footer">) =>
  [
    ...(browser
      ? [`${IN_BROWSER[blocks[0]?.lang ?? "en"]}: ${browser}`, ""]
      : []),
    ...blocks.flatMap((block) => [
      block.heading,
      "",
      ...block.paragraphs.flatMap((p) => [p, ""]),
      ...(block.lists ?? []).flatMap((list) => [
        list.title,
        ...list.items.map((item) =>
          [item.meta, item.title, item.href].filter(Boolean).join(" · ")
        ),
        "",
      ]),
      ...(block.action
        ? [`${block.action.label}: ${block.action.href}`, ""]
        : []),
      ...(block.signoff
        ? [
            block.signoff.closing,
            "",
            block.signoff.name,
            block.signoff.title,
            "",
          ]
        : []),
    ]),
    "--",
    ...footer.map((line) =>
      line.href ? `${line.text} ${line.link ?? ""}: ${line.href}` : line.text
    ),
    ...blocks.map((block) => FOOTER[block.lang]),
  ].join("\n");

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
      <Heading
        as="h1"
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
      </Heading>
      {block.paragraphs.map((paragraph) => (
        <Text key={paragraph} style={text}>
          {paragraph}
        </Text>
      ))}
      {(block.lists ?? []).map((list) => (
        <Section key={list.title} style={{ margin: "8px 0 16px" }}>
          <Text style={{ ...text, fontWeight: 500, margin: "0 0 8px" }}>
            {list.title}
          </Text>
          {list.items.map((item) => (
            <Text
              key={`${item.title}-${item.href ?? ""}`}
              style={{ ...text, margin: "0 0 8px" }}
            >
              {item.meta ? (
                <span style={{ color: ASH, fontSize: 14 }}>
                  {item.meta}
                  <br />
                </span>
              ) : null}
              {item.href ? (
                <Link
                  href={item.href}
                  style={{ color: CRIMSON, textDecoration: "underline" }}
                >
                  {item.title}
                </Link>
              ) : (
                item.title
              )}
            </Text>
          ))}
        </Section>
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
          {block.action.fallback ? (
            <Text
              style={{
                ...text,
                color: ASH,
                fontSize: 13,
                margin: "16px 0 0",
                wordBreak: "break-all",
              }}
            >
              {FALLBACK[block.lang]}{" "}
              <Link href={block.action.href} style={{ color: ASH }}>
                {block.action.href}
              </Link>
            </Text>
          ) : null}
        </Section>
      ) : null}
      {block.signoff ? (
        <Section style={{ margin: "32px 0 0" }}>
          <Text style={{ ...text, margin: "0 0 12px" }}>
            {block.signoff.closing}
          </Text>
          {block.signoff.image ? (
            <Img
              alt={block.signoff.name}
              height="100"
              src={block.signoff.image}
              style={{ display: "block", margin: "0 0 12px" }}
              width="480"
            />
          ) : null}
          <Text style={{ ...text, margin: 0 }}>{block.signoff.name}</Text>
          <Text style={{ ...text, color: ASH, margin: 0 }}>
            {block.signoff.title}
          </Text>
        </Section>
      ) : null}
    </Section>
  );
};

/**
 * Every notice the platform sends: white, the lockup in the email's
 * language, a Light headline, the message in the recipient's language only,
 * one crimson button and a hairline footer. No other images (but a
 * letter's signature), no tracking,
 * no exclamation marks.
 */
export const Notice = ({
  blocks,
  browser,
  footer = [],
  preview,
}: NoticeProps) => {
  const first = blocks[0]?.lang ?? "en";
  const small = {
    color: ASH,
    direction: first === "ar" ? ("rtl" as const) : ("ltr" as const),
    fontFamily: FONT,
    fontSize: 12,
    lineHeight: 1.6,
    margin: "0 0 4px",
    textAlign: first === "ar" ? ("right" as const) : ("left" as const),
  };
  return (
    <Html dir={first === "ar" ? "rtl" : "ltr"} lang={first}>
      <Head>
        {/* The brand is white paper: dark-mode mail apps leave it as it is. */}
        <meta content="light only" name="color-scheme" />
        <meta content="light" name="supported-color-schemes" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: WHITE, margin: 0, padding: "24px 0" }}>
        <Container style={{ maxWidth: 600, padding: "8px 32px 32px" }}>
          {browser ? (
            <Text style={{ ...small, margin: "0 0 16px" }}>
              <Link href={browser} style={{ color: ASH }}>
                {IN_BROWSER[first]}
              </Link>
            </Text>
          ) : null}
          <Img
            alt={NAME[first]}
            height={48}
            src={LOCKUP[first]}
            style={{
              display: "block",
              margin: first === "ar" ? "0 0 40px auto" : "0 0 40px",
            }}
            width={first === "ar" ? 92 : 96}
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
          {footer.map((line) => (
            <Text key={line.text} style={small}>
              {line.text}
              {line.href ? (
                <>
                  {" "}
                  <Link
                    href={line.href}
                    style={{ color: ASH, textDecoration: "underline" }}
                  >
                    {line.link ?? line.href}
                  </Link>
                </>
              ) : null}
            </Text>
          ))}
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
      action: {
        href: "https://auibsal.org/account",
        label: "Open Membership",
      },
      heading: "You're booked for the reading",
      lang: "en",
      paragraphs: ["Tuesday, October 13 · 6:00 p.m.", "Library, second floor"],
    },
  ],
  preview: "You're booked for the reading",
} satisfies NoticeProps;

/** @public React Email's preview server loads a template by its default export. */
// biome-ignore lint/complexity/noRedundantDefaultExport: React Email's preview server loads templates through their default export.
export default Notice;
