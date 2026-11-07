import { seedFromText } from "@repo/brand/components/sal/guilloche";

/** The card number as it is printed on the card. */
export const cardNumber = (value: number) => String(value).padStart(5, "0");

/**
 * A short mark of who signed and when, as on a digital seal: the same on
 * the site (`Signature`) and in an email's signature image.
 */
export const sealOf = (name: string, number: number | null, date: string) => {
  const hex = seedFromText(`${name}|${number ?? ""}|${date.slice(0, 10)}`)
    .toString(16)
    .toUpperCase()
    .padStart(8, "0");
  return `${hex.slice(0, 4)}-${hex.slice(4)}`;
};
