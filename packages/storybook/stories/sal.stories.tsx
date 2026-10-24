import { BrandLogo } from "@repo/design-system/components/brand-logo";
import { SalCard } from "@repo/design-system/components/sal/card";
import { DocumentFooter } from "@repo/design-system/components/sal/document-footer";
import { DocumentHeader } from "@repo/design-system/components/sal/document-header";
import { FormHeader } from "@repo/design-system/components/sal/form-header";
import { SectionHead } from "@repo/design-system/components/sal/section-head";
import { SocialPost } from "@repo/design-system/components/sal/social-post";
import type { Meta, StoryObj } from "@storybook/react";

/**
 * SAL brand components (v6), ported from brand/components (Document Cover,
 * Document Footer, Form Header, Social Post, Section Head): Light headlines,
 * hairlines, square corners and one accent. Screen components are in
 * "SAL/Screens (v6)".
 */
const meta = {
  title: "SAL/Brand",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const TypeStyles: Story = {
  render: () => (
    <div className="grid max-w-4xl gap-5">
      <p className="type-label">Label · tracked capitals, small</p>
      <h1 className="type-display-xl">
        The paper and the <span className="type-accent">pen.</span>
      </h1>
      <h2 className="type-display">Display: Light, in ink</h2>
      <h3 className="type-title">Title: 44 px Regular</h3>
      <h4 className="type-heading">Heading</h4>
      <p className="type-lede">
        Lede: a bilingual student society for literature, theater and the arts.
      </p>
      <p className="type-body">Body text is Regular, 1.6 leading.</p>
      <p className="type-caption text-text-secondary">
        Caption in text-secondary (ash).
      </p>
      <p className="reading max-w-[44ch] text-[1.375rem]">
        Reading: Literata, for the paper's decks and articles.
      </p>
      <p className="type-code">SAL-GOV-01 · Article 7</p>
      <p className="text-4xl" lang="ar">
        والقرطاسُ والقلم
      </p>
    </div>
  ),
};

export const Section: Story = {
  render: () => (
    <div className="grid max-w-4xl gap-6">
      <SectionHead
        action={
          <a className="link type-caption" href="#events">
            All events
          </a>
        }
        title="This term"
      />
      <ul className="grid border-line border-b">
        {["Open Pages", "The Majlis"].map((title, i) => (
          <li
            className="grid grid-cols-[6rem_1fr] gap-x-4 border-line border-t py-space-4"
            key={title}
          >
            <span className="font-light text-[2.75rem] leading-none">
              {String(13 + i * 7)}
            </span>
            <span className="text-xl">{title}</span>
          </li>
        ))}
      </ul>
    </div>
  ),
};

export const Form: Story = {
  render: () => (
    <FormHeader code="SAL-OPS-02 · F-14" title="Event Proposal">
      Labels are nouns; money fields give their unit.
    </FormHeader>
  ),
};

export const Document: Story = {
  render: () => (
    <article className="grid max-w-3xl gap-6">
      <DocumentHeader
        code="SAL-BRD-01"
        nameAr="جمعية الفنون والآداب"
        subtitle="The Society’s design system, version 6: the same logo, colors and type, used with more restraint"
        title="Brand & Identity"
      />
      <DocumentFooter
        code="SAL-BRD-01"
        end="Version 6 · Draft 1"
        title="Brand & Identity v6"
      />
    </article>
  ),
};

export const Card: Story = {
  render: () => (
    <SalCard className="max-w-sm">
      <p className="type-label">Membership</p>
      <h2 className="type-heading">Member name</h2>
      <p className="type-body text-text-secondary">
        No boxes in v6: a hairline above, the title and a line of text.
      </p>
    </SalCard>
  ),
};

export const Logo: Story = {
  render: () => (
    <div className="grid gap-6">
      <BrandLogo height={64} />
      <BrandLogo height={64} variant="bilingual" />
      <div className="band p-6">
        <BrandLogo ground="dark" height={64} />
      </div>
    </div>
  ),
};

export const Posts: Story = {
  render: () => (
    <div className="grid max-w-4xl grid-cols-2 gap-space-4 md:grid-cols-3">
      <SocialPost
        date="Tuesday, October 13"
        ground="crimson"
        headline={
          <>
            Charter <i>Day.</i>
          </>
        }
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
      <SocialPost
        date="No audition, no fee"
        ground="white"
        headline={
          <>
            For every <i>student.</i>
          </>
        }
      />
    </div>
  ),
};

export const Band: Story = {
  render: () => (
    <section className="band p-8" data-theme="light">
      <h2 className="type-title text-on-band">Join the Society</h2>
      <p>At most one crimson band per page; crimson never on ink.</p>
    </section>
  ),
};
