"use client";

import { Guilloche, seedFromText } from "@repo/brand/components/sal/guilloche";
import { cn } from "@repo/brand/lib/utils";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { membership } from "@/lib/data";
import { useProfile } from "@/lib/diwan/queries";
import { cardNumber, sealOf } from "@/lib/signature-seal";

export interface SignatureProps {
  readonly className?: string;
  /** When it was signed (ISO); today while it is being signed. */
  readonly date?: string;
  /**
   * The line above the signature, as on the memorandum of partnership
   * ("For the Society", "Signed by", "Sign as"): one design for every
   * signature block on the site.
   */
  readonly label?: string;
  /** The signer's name on the platform; the page's language is shown. */
  readonly name: string;
  /** The signer's membership card number, when they have a card. */
  readonly number?: number | null;
}

const ARABIC = /[\u0600-\u06FF]/u;
const BOTH = /\s+·\s+/u;

/**
 * The name in the page's language only (one language per page): a name
 * held in both ("Sadeq Hayder · صادق حيدر") shows the page's half.
 */
export const nameInLanguage = (name: string, locale: string) => {
  const halves = name.split(BOTH);
  const arabic = halves.find((h) => ARABIC.test(h));
  const latin = halves.find((h) => !ARABIC.test(h));
  return (locale === "ar" ? arabic || latin : latin || arabic) ?? name;
};

/**
 * A signature on the platform (decisions.md): the signer's name in
 * the signature face, in the page's language, their card number and the date, beside a guilloche
 * rosette drawn from the number (or the name) and a short seal, so it
 * reads as a digital signature and no two look alike. Nobody types it:
 * it is always the name the person holds on the platform.
 */
export const Signature = ({
  className,
  date,
  label,
  name,
  number = null,
}: SignatureProps) => {
  const t = useTranslations("common.signature");
  const locale = useLocale() as Locale;
  const when = date ?? new Date().toISOString();
  const seed = number ?? seedFromText(name);
  const shown = nameInLanguage(name, locale);
  const arabic = ARABIC.test(shown);
  const figure = (
    <figure
      className={cn(
        "border-line relative flex max-w-md items-center gap-4 overflow-hidden border-y py-3",
        className
      )}
    >
      <Guilloche
        className="size-16 shrink-0"
        number={seed}
        stroke="stroke-accent"
      />
      <div className="grid min-w-0 gap-1">
        <span
          className={cn(
            "font-signature text-text truncate leading-tight",
            arabic ? "text-3xl" : "text-4xl"
          )}
          dir={arabic ? "rtl" : "ltr"}
          lang={arabic ? "ar" : "en"}
        >
          {shown}
        </span>
        <figcaption className="type-caption text-text-secondary flex flex-wrap gap-x-3">
          {number === null ? null : (
            <span>{t("number", { number: cardNumber(number) })}</span>
          )}
          <span>{formatLongDate(when, locale)}</span>
          <span className="font-mono" dir="ltr">
            {sealOf(name, number, when)}
          </span>
        </figcaption>
      </div>
    </figure>
  );
  if (!label) {
    return figure;
  }
  return (
    <div className="grid gap-1">
      <span className="type-caption">{label}</span>
      {figure}
    </div>
  );
};

/**
 * The signed-in person's own signature: the name the register holds (the
 * one the database signs in, "Sign as …") and their card number, dated
 * today (or `date`).
 */
export const MySignature = ({
  className,
  date,
  label,
}: {
  readonly className?: string;
  readonly date?: string;
  readonly label?: string;
}) => {
  const { supabase, user } = useAuth();
  const profile = useProfile();
  const card = useQuery({
    enabled: Boolean(user),
    queryFn: () => membership.myCard(supabase),
    queryKey: ["membership", "card", user?.id],
  });
  const registered = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      (await supabase.schema("core").rpc("my_register_name")).data ?? null,
    queryKey: ["forms", "me", user?.id],
  });
  const name = registered.data || profile.data?.full_name_en || "";
  if (!name) {
    return null;
  }
  return (
    <Signature
      className={className}
      date={date}
      label={label}
      name={name}
      number={card.data?.number ?? null}
    />
  );
};
