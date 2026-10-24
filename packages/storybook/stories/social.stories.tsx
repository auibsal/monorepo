import { SocialPost } from "@repo/design-system/components/sal/social-post";
import type { Meta, StoryObj } from "@storybook/react";

/**
 * Social templates (brand/components/previews: SocialPost, Carousel,
 * Story), in English and Arabic: one language per piece, never both. Posts
 * are the platform's React component; carousels and stories use the
 * brand's own markup and bundle.css.
 */
const meta = {
  // The brand kit's CSS is served from brand/ (.storybook/main.ts,
  // staticDirs): a package may not import files outside itself.
  decorators: [
    (Story) => (
      <>
        <link href="/brand-kit/tokens.css" rel="stylesheet" />
        <link href="/brand-kit/components/bundle.css" rel="stylesheet" />
        <Story />
      </>
    ),
  ],
  title: "SAL/Social",
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
        headline={
          <>
            Edition 1 is <i>open.</i>
          </>
        }
        lede="Poems, stories, essays, photographs and drawings."
      />
      <SocialPost
        date="Thursday, November 19 · 6:00 PM"
        ground="white"
        headline={
          <>
            Next Stop, the <i>premiere.</i>
          </>
        }
        lede="Episode one of the campus series, filmed on the AUIB bus."
      />
      <SocialPost
        date="auibsal.org/join"
        ground="ink"
        headline={
          <>
            Come <i>in.</i>
          </>
        }
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
        headline={
          <>
            الإصدار الأول <i>مفتوح.</i>
          </>
        }
        lang="ar"
        lede="قصائد وقصص ومقالات وصور ورسوم."
      />
      <SocialPost
        date="الخميس 19 تشرين الثاني · 6:00 مساءً"
        ground="white"
        headline={
          <>
            المحطة القادمة، <i>العرض الأول.</i>
          </>
        }
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

const slides = {
  ar: [
    [
      "01",
      "اختر قسمًا.",
      "الأدب أو المعرض: قصيدة أو قصة أو مقالة أو صورة أو رسم.",
    ],
    ["02", "أرسل عملك.", "من حسابك على auibsal.org، قبل 3 كانون الأول."],
  ],
  en: [
    [
      "01",
      "Choose a desk.",
      "Letters or Gallery: a poem, a story, an essay, a photograph, a drawing.",
    ],
    [
      "02",
      "Send your work.",
      "From your account on auibsal.org, by December 3.",
    ],
  ],
} as const;

const Carousel = ({ lang }: { lang: "ar" | "en" }) => {
  const ar = lang === "ar";
  const dir = ar ? "rtl" : "ltr";
  return (
    <div className={grid}>
      <SocialPost
        date={ar ? "حتى 3 كانون الأول" : "Until December 3"}
        ground="white"
        headline={
          ar ? (
            <>
              كيف <i>تشارك.</i>
            </>
          ) : (
            <>
              How to <i>submit.</i>
            </>
          )
        }
        lang={lang}
        lede={ar ? "قرطاس، الإصدار الأول." : "Qirtas, Edition 1."}
      />
      {slides[lang].map(([num, title, body]) => (
        <div
          className="sal-post sal-post--white"
          dir={dir}
          key={num}
          lang={lang}
        >
          <div className="sal-post__frame">
            <p className="sal-post__num">{num}</p>
            <h3 className="sal-post__title">{title}</h3>
            <p className="sal-post__body">{body}</p>
          </div>
        </div>
      ))}
      <div
        className="sal-post sal-post--white sal-post--end"
        dir={dir}
        lang={lang}
      >
        <div className="sal-post__frame">
          {/* biome-ignore lint/performance/noImgElement: the wordmark as supplied */}
          <img
            alt={
              ar ? "جمعية الفنون والآداب" : "AUIB Society of Arts and Letters"
            }
            className="sal-post__wordmark"
            height={520}
            src={
              ar ? "/brand/sal-wordmark-ar.svg" : "/brand/sal-wordmark-en.svg"
            }
            width={ar ? 515 : 514}
          />
        </div>
      </div>
    </div>
  );
};

/** A cover post, numbered inside slides and the wordmark alone at the end. */
export const CarouselEnglish: Story = { render: () => <Carousel lang="en" /> };
export const CarouselArabic: Story = { render: () => <Carousel lang="ar" /> };

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
                ? "/brand/sal-lockup-horizontal-ar-reversed.svg"
                : "/brand/sal-lockup-horizontal-reversed.svg"
            }
            width={ar ? 253 : 264}
          />
          <h2 className="sal-post__headline">
            {ar ? (
              <>
                الإصدار الأول <i>مفتوح.</i>
              </>
            ) : (
              <>
                Edition 1 is <i>open.</i>
              </>
            )}
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
