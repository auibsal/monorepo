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
  /** The signer's name on the platform, in English (a signature is Latin). */
  readonly name: string;
  /** The signer's membership card number, when they have a card. */
  readonly number?: number | null;
}

/**
 * A signature on the platform (decisions.md): the signer's name in
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
          className="font-signature text-text truncate text-4xl leading-tight"
          dir="ltr"
          lang="en"
        >
          {name}
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
