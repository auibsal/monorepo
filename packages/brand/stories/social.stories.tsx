import { Icon, type IconName } from "@repo/brand/components/sal/icon";
import { SocialPost } from "@repo/brand/components/sal/social-post";
import type { Meta, StoryObj } from "@storybook/react";

/**
 * Social templates (packages/brand/assets/components/previews: SocialPost, Carousel,
 * Story, Highlights), in English and Arabic: one language per piece, never
 * both (the highlights are English, like the account). Posts
 * are the platform's React component; carousels and stories use the
 * brand's own markup and bundle.css.
 */
const meta = {
  // The brand kit's CSS is served from brand/ (.storybook/main.ts,
  // staticDirs): a package may not import files outside itself.
  decorators: [
    (Story) => (
      <>
        <link href="brand-kit/tokens.css" rel="stylesheet" />
        <link href="brand-kit/components/bundle.css" rel="stylesheet" />
        <Story />
      </>
    ),
  ],
  title: "Social/Templates",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const grid = "grid max-w-5xl grid-cols-2 gap-6 md:grid-cols-3";

export const PostsEnglish: Story = {
  render: () => (
    <div className={grid}>
      <SocialPost
        date="Until December 3 · auibsal.org/qirtas"
        ground="crimson"
        headline={<>Edition 1 is open.</>}
        lede="Poems, stories, essays, photographs and drawings."
      />
      <SocialPost
        date="Thursday, November 19 · 6:00 p.m."
        ground="white"
        headline={<>Next Stop, the premiere.</>}
        lede="Episode one of the campus series, filmed on the AUIB bus."
      />
      <SocialPost
        date="auibsal.org/join"
        ground="ink"
        headline={<>Come in.</>}
        lede="Membership is free and open to every AUIB student."
      />
    </div>
  ),
};

export const PostsArabic: Story = {
  render: () => (
    <div className={grid} dir="rtl">
      <SocialPost
        date="حتى 3 كانون الأول · auibsal.org/ar/qirtas"
        ground="crimson"
        headline={<>الإصدار الأول مفتوح.</>}
        lang="ar"
        lede="قصائد وقصص ومقالات وصور ورسوم."
      />
      <SocialPost
        date="الخميس 19 تشرين الثاني · 6:00 مساءً"
        ground="white"
        headline={<>المحطة القادمة، العرض الأول.</>}
        lang="ar"
        lede="الحلقة الأولى من السلسلة الجامعية، مصوّرة في حافلة الجامعة."
      />
      <SocialPost
        date="auibsal.org/ar/join"
        ground="ink"
        headline="تفضّلوا."
        lang="ar"
        lede="العضوية مجانية ومفتوحة لكل طلبة الجامعة."
      />
    </div>
  ),
};

/**
 * "What's on this spring" (decisions §6, §7): the term calendar, posted
 * once as a carousel. One carousel, each English slide followed by the
 * same slide in Arabic; there is no standing weekly post, and each event
 * gets its own post once its room is confirmed.
 */
const springSlides = [
  {
    ar: [
      "01",
      "الاجتماعات العامة.",
      "أيام الأربعاء، 2:15–3:00 م: 17 شباط، 3 و17 و31 آذار، 14 و28 نيسان، 12 أيار.",
    ],
    en: [
      "01",
      "General meetings.",
      "Wednesdays, 2:15–3:00 p.m.: February 17; March 3, 17 and 31; April 14 and 28; May 12.",
    ],
  },
  {
    ar: [
      "02",
      "الاجتماع التأسيسي.",
      "الثلاثاء 30 آذار، 2:30–4:00 م. يصوّت فيه الأعضاء على الدستور.",
    ],
    en: [
      "02",
      "The Founding Meeting.",
      "Tuesday, March 30, 2:30–4:00 p.m. Members vote on the Constitution.",
    ],
  },
  {
    ar: ["03", "جولة الآلة الكاتبة.", "في أسبوع معرض الأندية في الربيع."],
    en: ["03", "The Typewriter Tour.", "In the spring club fair week."],
  },
] as const;

const Slide = ({
  body,
  lang,
  num,
  title,
}: {
  body: string;
  lang: "ar" | "en";
  num: string;
  title: string;
}) => (
  <div
    className="sal-post sal-post--white"
    dir={lang === "ar" ? "rtl" : "ltr"}
    lang={lang}
  >
    <div className="sal-post__frame">
      <p className="sal-post__num">{num}</p>
      <h3 className="sal-post__title">{title}</h3>
      <p className="sal-post__body">{body}</p>
    </div>
  </div>
);

const Wordmark = ({ lang }: { lang: "ar" | "en" }) => (
  <div
    className="sal-post sal-post--white sal-post--end"
    dir={lang === "ar" ? "rtl" : "ltr"}
    lang={lang}
  >
    <div className="sal-post__frame">
      {/* biome-ignore lint/performance/noImgElement: the wordmark as supplied */}
      <img
        alt={
          lang === "ar"
            ? "جمعية الفنون والآداب"
            : "AUIB Society of Arts and Letters"
        }
        className="sal-post__wordmark"
        height={520}
        src={
          lang === "ar"
            ? "brand/sal-wordmark-ar.svg"
            : "brand/sal-wordmark-en.svg"
        }
        width={lang === "ar" ? 515 : 514}
      />
    </div>
  </div>
);

/** The cover, the numbered slides and the wordmark: English, then Arabic. */
export const WhatsOnThisSpring: Story = {
  name: "Carousel: What's on this spring",
  render: () => (
    <div className={grid}>
      <SocialPost
        date="Spring 2027"
        ground="white"
        headline={<>What’s on this spring.</>}
        lang="en"
        lede="Rooms and each event’s own post follow on auibsal.org/events."
      />
      <SocialPost
        date="ربيع 2027"
        ground="white"
        headline={<>ما يجري هذا الربيع.</>}
        lang="ar"
        lede="القاعات ومنشور كل فعالية تتبع على auibsal.org/events."
      />
      {springSlides.flatMap((slide) => [
        <Slide
          body={slide.en[2]}
          key={`${slide.en[0]}-en`}
          lang="en"
          num={slide.en[0]}
          title={slide.en[1]}
        />,
        <Slide
          body={slide.ar[2]}
          key={`${slide.ar[0]}-ar`}
          lang="ar"
          num={slide.ar[0]}
          title={slide.ar[1]}
        />,
      ])}
      <Wordmark lang="en" />
      <Wordmark lang="ar" />
    </div>
  ),
};

const StoryFrame = ({ lang }: { lang: "ar" | "en" }) => {
  const ar = lang === "ar";
  return (
    <div className="max-w-xs">
      <div
        className="sal-story sal-story--crimson"
        dir={ar ? "rtl" : "ltr"}
        lang={lang}
      >
        <div className="sal-story__frame">
          {/* biome-ignore lint/performance/noImgElement: the lockup as supplied */}
          <img
            alt={
              ar ? "جمعية الفنون والآداب" : "AUIB Society of Arts and Letters"
            }
            className="sal-post__lockup"
            height={132}
            src={
              ar
                ? "brand/sal-lockup-horizontal-ar-reversed.svg"
                : "brand/sal-lockup-horizontal-reversed.svg"
            }
            width={ar ? 253 : 264}
          />
          <h2 className="sal-post__headline">
            {ar ? <>الإصدار الأول مفتوح.</> : <>Edition 1 is open.</>}
          </h2>
          <p className="sal-post__lede">
            {ar
              ? "قصائد وقصص ومقالات وصور ورسوم."
              : "Poems, stories, essays, photographs and drawings."}
          </p>
          <p className="sal-post__meta">
            <span>{ar ? "حتى 3 كانون الأول" : "Until December 3"}</span>
            <bdi dir="ltr">@auibsal</bdi>
          </p>
        </div>
      </div>
    </div>
  );
};

/** 1080 × 1920: every word 250 px clear of the top and 340 px of the bottom. */
export const StoryEnglish: Story = { render: () => <StoryFrame lang="en" /> };
export const StoryArabic: Story = { render: () => <StoryFrame lang="ar" /> };

// The six Instagram highlights, in order, each with its icon (Highlights).
const highlights: [string, IconName][] = [
  ["What's on", "calendar"],
  ["Qirtas", "newspaper"],
  ["The Company", "drama"],
  ["Next Stop", "bus"],
  ["Join", "user-plus"],
  ["Partners", "handshake"],
];

export const Highlights: Story = {
  render: () => (
    <div className="grid max-w-4xl grid-cols-3 gap-6">
      {highlights.map(([name, icon]) => (
        <div className="sal-highlight sal-highlight--round" key={name}>
          <div className="sal-highlight__frame">
            <Icon className="sal-highlight__icon" label={name} name={icon} />
          </div>
        </div>
      ))}
    </div>
  ),
};
