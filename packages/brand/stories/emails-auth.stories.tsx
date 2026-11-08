import type { Meta, StoryObj } from "@storybook/react";

/**
 * The sign-in emails Supabase Auth sends, from the templates pasted into
 * the hosted project (packages/database/supabase/templates, served here
 * as auth-templates/). Each holds both languages and picks one by the
 * member's locale; the story fills Supabase's variables with samples.
 */
const meta = {
  title: "Emails/Sign-in",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const SAMPLE: Record<string, string> = {
  Email: "lina.ahmed@auib.edu.iq",
  FactorType: "totp",
  OldEmail: "lina.a@auib.edu.iq",
  RedirectTo: "https://auibsal.org/account",
  // The email images come from the site's own public/brand.
  SiteURL: globalThis.location?.origin ?? "https://auibsal.org",
  Token: "48213907",
  TokenHash: "sample",
};

const IF_AR =
  /\{\{ if and \.Data\.locale \(eq \.Data\.locale "ar"\) \}\}([\s\S]*?)\{\{ else \}\}([\s\S]*?)\{\{ end \}\}/gu;

/** The template as one language sees it. */
const fill = (template: string, lang: "ar" | "en") =>
  template
    .replace(IF_AR, (_, ar: string, en: string) => (lang === "ar" ? ar : en))
    .replace(/\{\{ \.(\w+) \}\}/gu, (_, key: string) => SAMPLE[key] ?? "");

const auth = (name: string): Story => ({
  loaders: [
    async () => ({
      template: await (await fetch(`auth-templates/${name}.html`)).text(),
    }),
  ],
  render: (_, { loaded }) => (
    <div className="grid gap-8 lg:grid-cols-2">
      {(["en", "ar"] as const).map((lang) => (
        <iframe
          className="border-line h-[44rem] w-full border bg-white"
          key={lang}
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          srcDoc={fill(loaded.template as string, lang)}
          title={`${name} (${lang})`}
        />
      ))}
    </div>
  ),
});

export const MagicLink = auth("magic_link");
export const Confirmation = auth("confirmation");
export const Recovery = auth("recovery");
export const EmailChange = auth("email_change");
export const PasswordChanged = auth("password_changed_notification");
export const EmailChanged = auth("email_changed_notification");
export const TwoStepAdded = auth("mfa_factor_enrolled_notification");
export const TwoStepRemoved = auth("mfa_factor_unenrolled_notification");
