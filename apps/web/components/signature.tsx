"use client";

import { useAuth } from "@repo/auth/provider";
import { cn } from "@repo/design-system/lib/utils";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { membership } from "@repo/sal-data";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Guilloche, seedFromText } from "@/components/guilloche";
import { useProfile } from "@/lib/nexus/queries";

/** The card number as it is printed on the card. */
const cardNumber = (value: number) => String(value).padStart(4, "0");

/** A short mark of who signed and when, as on a digital seal. */
const sealOf = (name: string, number: number | null, date: string) => {
  const hex = seedFromText(`${name}|${number ?? ""}|${date.slice(0, 10)}`)
    .toString(16)
    .toUpperCase()
    .padStart(8, "0");
  return `${hex.slice(0, 4)}-${hex.slice(4)}`;
};

export interface SignatureProps {
  readonly className?: string;
  /** When it was signed (ISO); today while it is being signed. */
  readonly date?: string;
  /** The signer's name on the platform, in English (a signature is Latin). */
  readonly name: string;
  /** The signer's membership card number, when they have a card. */
  readonly number?: number | null;
}

/**
 * A signature on the platform (owner, Oct 31, 2026): the signer's name in
 * the signature face, their card number and the date, beside a guilloche
 * rosette drawn from the number (or the name) and a short seal, so it
 * reads as a digital signature and no two look alike. Nobody types it:
 * it is always the name the person holds on the platform.
 */
export const Signature = ({
  className,
  date,
  name,
  number = null,
}: SignatureProps) => {
  const t = useTranslations("common.signature");
  const locale = useLocale() as Locale;
  const when = date ?? new Date().toISOString();
  const seed = number ?? seedFromText(name);
  return (
    <figure
      className={cn(
        "relative flex max-w-md items-center gap-4 overflow-hidden border-line border-y py-3",
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
          className="truncate font-signature text-4xl text-text leading-tight"
          dir="ltr"
          lang="en"
        >
          {name}
        </span>
        <figcaption className="type-caption flex flex-wrap gap-x-3 text-text-secondary">
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
};

/**
 * The signed-in person's own signature: their name on the platform and
 * their card number, dated today (or `date`).
 */
export const MySignature = ({
  className,
  date,
}: {
  readonly className?: string;
  readonly date?: string;
}) => {
  const { supabase, user } = useAuth();
  const profile = useProfile();
  const card = useQuery({
    enabled: Boolean(user),
    queryFn: () => membership.myCard(supabase),
    queryKey: ["membership", "card", user?.id],
  });
  const name = profile.data?.full_name_en ?? "";
  if (!name) {
    return null;
  }
  return (
    <Signature
      className={className}
      date={date}
      name={name}
      number={card.data?.number ?? null}
    />
  );
};
