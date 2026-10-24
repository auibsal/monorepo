import { SectionHead } from "@repo/design-system/components/sal/section-head";
import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import type { Meta, StoryObj } from "@storybook/react";
import type { ReactNode } from "react";

/**
 * Screens (brand/BRAND-BOOK.md, "Screens"): one solid accent button and
 * text links for everything else, 1px line inputs, hairline lists in place
 * of boxes, square corners, no shadows. Titles stand alone; tracked
 * capitals only name fields, columns and metadata (never Arabic). Every
 * screen comes in English and in Arabic, one language each. Check each in
 * light and dark mode (Theme toolbar).
 */
const meta = {
  title: "SAL/Screens",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;
type Lang = "ar" | "en";

const Page = ({ children, lang }: { children: ReactNode; lang: Lang }) => (
  <div dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
    {children}
  </div>
);

const copy = {
  ar: {
    book: "احجز مكانًا",
    calendar: "أضف إلى التقويم",
    constitution: "اقرأ الدستور",
    date: "الثلاثاء 13 تشرين الأول · 6:00 مساءً",
    email: "البريد الإلكتروني",
    emailHint: "استخدم بريدك الجامعي (@auib.edu.iq) إن كان لديك.",
    events: "كل الفعاليات",
    giveBack: "تنازل عن مكاني",
    line: "اقرأ صفحة تحبها، أو استمع فحسب.",
    members: "128 عضوًا، منهم 41 لهم حق التصويت.",
    places: "24 مكانًا متبقيًا",
    pledge: "أتعهّد بتعهّد العضو",
    send: "أرسل الرابط",
    thisTerm: "هذا الفصل",
    title: "صفحات مفتوحة",
  },
  en: {
    book: "Book a place",
    calendar: "Add to calendar",
    constitution: "Read the Constitution",
    date: "Tuesday, October 13 · 6:00 PM",
    email: "Email",
    emailHint: "Use your AUIB address (@auib.edu.iq) if you have one.",
    events: "All events",
    giveBack: "Give my place back",
    line: "Read a page you love, or just listen.",
    members: "128 members, 41 of them Voting Members.",
    places: "24 places left",
    pledge: "I make the Member Pledge",
    send: "Send the link",
    thisTerm: "This term",
    title: "Open Pages",
  },
} as const;

const Buttons = ({ lang }: { lang: Lang }) => {
  const t = copy[lang];
  return (
    <Page lang={lang}>
      <div className="flex flex-wrap items-center gap-6">
        <Button>{t.book}</Button>
        <Button variant="link">{t.calendar}</Button>
        <Button variant="ghost">{t.giveBack}</Button>
        <Button variant="link">{t.constitution}</Button>
      </div>
    </Page>
  );
};

export const ButtonsEnglish: Story = { render: () => <Buttons lang="en" /> };
export const ButtonsArabic: Story = { render: () => <Buttons lang="ar" /> };

/** A section and its rows: the title alone, hairlines between rows. */
const List = ({ lang }: { lang: Lang }) => {
  const t = copy[lang];
  return (
    <Page lang={lang}>
      <section className="grid max-w-4xl gap-6">
        <SectionHead
          action={
            <a className="link type-caption" href="#events">
              {t.events}
            </a>
          }
          title={t.thisTerm}
        />
        <ul className="grid divide-y divide-line">
          <li className="grid gap-2 py-4">
            <h3 className="type-heading">{t.title}</h3>
            <p className="type-body text-text-secondary">{t.line}</p>
            <p className="type-caption">
              {t.date} · {t.places}
            </p>
          </li>
          <li className="grid gap-2 py-4">
            <p className="font-light text-5xl text-text tabular-nums">128</p>
            <p className="type-body">{t.members}</p>
          </li>
        </ul>
      </section>
    </Page>
  );
};

export const ListEnglish: Story = { render: () => <List lang="en" /> };
export const ListArabic: Story = { render: () => <List lang="ar" /> };

const Form = ({ lang }: { lang: Lang }) => {
  const t = copy[lang];
  return (
    <Page lang={lang}>
      <form className="grid max-w-md gap-4">
        <div className="grid gap-2">
          <Label htmlFor={`story-email-${lang}`}>{t.email}</Label>
          <Input
            dir="ltr"
            id={`story-email-${lang}`}
            placeholder="name@auib.edu.iq"
            type="email"
          />
          <p className="type-caption">{t.emailHint}</p>
        </div>
        <div className="flex items-start gap-3">
          <Checkbox id={`story-pledge-${lang}`} />
          <Label className="leading-normal" htmlFor={`story-pledge-${lang}`}>
            {t.pledge}
          </Label>
        </div>
        <Button className="justify-self-start" type="submit">
          {t.send}
        </Button>
      </form>
    </Page>
  );
};

export const FormEnglish: Story = { render: () => <Form lang="en" /> };
export const FormArabic: Story = { render: () => <Form lang="ar" /> };
