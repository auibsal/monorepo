import { BrandLogo } from "@repo/brand/components/brand-logo";
import { SalCard } from "@repo/brand/components/sal/card";
import { DocumentFooter } from "@repo/brand/components/sal/document-footer";
import { DocumentHeader } from "@repo/brand/components/sal/document-header";
import { FormHeader } from "@repo/brand/components/sal/form-header";
import { FormField, FormPage } from "@repo/brand/components/sal/form-page";
import { SectionHead } from "@repo/brand/components/sal/section-head";
import { Shelf } from "@repo/brand/components/sal/shelf";
import type { Meta, StoryObj } from "@storybook/react";

/**
 * SAL brand components, ported from packages/brand/assets/components (Document Cover,
 * Document Footer, Form Header, Section Head): Light headlines,
 * hairlines, square corners and one accent. Screen components are in
 * "Components/Screens", social posts in "Social/Templates".
 */
const meta = {
  title: "Components/Brand",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const TypeStyles: Story = {
  render: () => (
    <div className="grid max-w-4xl gap-5">
      <h1 className="type-display-xl">The paper and the pen.</h1>
      <h2 className="type-display">Display: Light, in ink</h2>
      <h3 className="type-title">Title: 44 px Light, standing alone</h3>
      <h4 className="type-heading">Heading</h4>
      <p className="type-lede">
        Lede: a society for literature, theater and the arts.
      </p>
      <p className="type-body">Body text is Regular, 1.6 leading.</p>
      <p className="type-caption text-text-secondary">
        Caption in text-secondary (ash): News · October 14
      </p>
      <p className="type-label">
        Label: names fields and columns, never above a title
      </p>
      <p className="reading max-w-[44ch] text-[1.375rem]">
        Reading: Literata, for the paper's decks and articles.
      </p>
      <p className="type-code">SAL-GOV-01 · Article 7</p>
    </div>
  ),
};

/** Arabic: Ubuntu Arabic Regular, in one color. */
export const TypeStylesArabic: Story = {
  render: () => (
    <div className="grid max-w-4xl gap-5" dir="rtl" lang="ar">
      <h1 className="type-display-xl">والقرطاسُ والقلمُ.</h1>
      <h3 className="type-title">هذا الفصل</h3>
      <p className="type-lede">جمعية للأدب والمسرح والفنون.</p>
      <p className="type-body">النص بخط Ubuntu Arabic العادي.</p>
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
        {["Writing workshop", "Readings and conversation"].map((title, i) => (
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

/** The top of a form, on the site and on the printed backup alike. */
export const Form: Story = {
  render: () => (
    <FormHeader code="SAL-EXB-01 · F-15" title="Photo release">
      Labels are nouns, in sentence case; a field that counts says what it
      counts.
    </FormHeader>
  ),
};

const RELEASE_USES = [
  "Qirtas and the Society's website",
  "The Society's Instagram and YouTube",
  "Posters and printed programs",
];

/**
 * The standard form page, auibsal.org/forms/<number> (decided Nov 7):
 * every form people outside the staff fill, signed by typing a name. The
 * site keeps the signed copy; paper is only a backup.
 */
export const FormPageStory: Story = {
  name: "Form page",
  render: () => (
    <FormPage
      code="SAL-EXB-01 · F-15"
      date="Saturday, November 7"
      dateLabel="Date"
      kept="The Director of Media's team reads it. The signed copy is kept in your account, under Forms."
      purpose="Lets the Society use photos and recordings of you from its events. You can withdraw it at any time in your account."
      signature={{
        hint: "Your typed name is your signature on this form.",
        label: "Type your full name to sign",
      }}
      submit="Sign and send"
      title="Photo release"
    >
      <FormField id="release-name" label="Full name">
        <input
          className="h-11 w-full border-text border-b bg-transparent text-text outline-none focus-visible:border-accent"
          defaultValue="Lina Hassan"
          id="release-name"
          type="text"
        />
      </FormField>
      <FormField id="release-event" label="Event">
        <input
          className="h-11 w-full border-text border-b bg-transparent text-text outline-none focus-visible:border-accent"
          defaultValue="Writing workshop, Tuesday, November 17"
          id="release-event"
          type="text"
        />
      </FormField>
      <fieldset className="grid gap-2">
        <legend className="mb-2 font-medium text-sm text-text">
          Where the photos may appear
        </legend>
        {RELEASE_USES.map((use) => (
          <label
            className="flex items-center gap-3 border-line border-b py-2 text-text"
            key={use}
          >
            <input className="size-4 accent-[var(--accent)]" type="checkbox" />
            {use}
          </label>
        ))}
      </fieldset>
    </FormPage>
  ),
};

/** The printed backup: the same form, photographed into the record the same day. */
export const PrintedForm: Story = {
  render: () => (
    <section
      className="grid max-w-2xl gap-6 bg-white p-8 text-text"
      data-theme="light"
    >
      <FormHeader code="SAL-EXB-01 · F-15" title="Photo release" />
      <div className="grid grid-cols-2 gap-6">
        {["Full name", "Event", "Signature", "Date"].map((field) => (
          <div className="grid gap-2" key={field}>
            <span className="font-medium text-[10.4px] text-text-secondary uppercase tracking-[0.1em]">
              {field}
            </span>
            <span className="block h-7 border-text border-b" />
          </div>
        ))}
      </div>
    </section>
  ),
};

export const Document: Story = {
  render: () => (
    <article className="grid max-w-3xl gap-6">
      <DocumentHeader
        code="SAL-MED-02"
        subtitle="The logo, colors, type and voice of the Society, quiet by default, one loud thing per page"
        title="Brand and Identity"
      />
      <DocumentFooter
        code="SAL-MED-02"
        end="Version 1"
        title="Brand and Identity"
      />
    </article>
  ),
};

export const Card: Story = {
  render: () => (
    <SalCard className="max-w-sm">
      <h2 className="type-heading">Member name</h2>
      <p className="type-caption">Member since Saturday, October 24</p>
      <p className="type-body text-text-secondary">
        No boxes: a hairline above, the title and a line of text.
      </p>
    </SalCard>
  ),
};

export const Logo: Story = {
  render: () => (
    <div className="grid gap-6">
      <BrandLogo height={64} />
      <BrandLogo height={64} locale="ar" />
      <div className="band p-6">
        <BrandLogo ground="dark" height={64} />
      </div>
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

const shelfItems = (titles: readonly string[]) =>
  titles.map((title) => ({
    key: title,
    node: (
      <a className="grid gap-2 hover:underline" href="#shelf">
        <span className="grid aspect-[3/4] place-items-center border border-line p-4 text-center">
          <span className="type-heading">{title}</span>
        </span>
        <span className="type-caption text-text-secondary">{title}</span>
      </a>
    ),
  }));

/**
 * The shelf (owner, Nov 4, 2026): one row that scrolls sideways and snaps,
 * moved by swiping or the arrow keys; the item at the start carries the ink
 * hairline. The plain list is always one link away.
 */
export const ShelfRow: Story = {
  render: () => (
    <div className="max-w-4xl">
      <Shelf
        items={shelfItems(["One", "Two", "Three", "Four", "Five", "Six"])}
        label="Shelf"
        listLink={
          <a className="link" href="#list">
            See them as a list
          </a>
        }
        nextLabel="Next"
        previousLabel="Previous"
      />
    </div>
  ),
};

/** On Arabic pages the shelf runs right to left, and so do its keys. */
export const ShelfArabic: Story = {
  render: () => (
    <div className="max-w-4xl" dir="rtl" lang="ar">
      <Shelf
        items={shelfItems(["واحد", "اثنان", "ثلاثة", "أربعة", "خمسة"])}
        label="رف"
        listLink={
          <a className="link" href="#list">
            اعرضها قائمةً
          </a>
        }
        nextLabel="التالي"
        previousLabel="السابق"
      />
    </div>
  ),
};
