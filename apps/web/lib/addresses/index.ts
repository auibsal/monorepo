/**
 * Addresses (decisions.md, The site: "Addresses are generated, readable and
 * permanent"): lowercase ASCII words joined by hyphens, made from the
 * English title and set automatically, never typed. A title only in Arabic
 * is written in Latin letters first, with the glossary's spellings for the
 * Society's own words (claude/glossary_ar.md) and a plain letter-for-letter
 * reading for the rest. Once published an address is fixed
 * (private.address_stays); a change then is a 308 in next.config.ts.
 */

/** The Society's words as the glossary spells them in English. */
const GLOSSARY: Readonly<Record<string, string>> = {
  الديوان: "diwan",
  ديوان: "diwan",
  قرطاس: "qirtas",
  قلم: "qalam",
  هدهد: "hudhud",
  المتنبي: "mutanabbi",
};

/** One Latin reading per Arabic letter (Iraqi letters included). */
const LETTERS: Readonly<Record<string, string>> = {
  ء: "",
  آ: "a",
  أ: "a",
  ؤ: "u",
  إ: "i",
  ئ: "i",
  ا: "a",
  ب: "b",
  ة: "a",
  ت: "t",
  ث: "th",
  ج: "j",
  ح: "h",
  خ: "kh",
  د: "d",
  ذ: "dh",
  ر: "r",
  ز: "z",
  س: "s",
  ش: "sh",
  ص: "s",
  ض: "d",
  ط: "t",
  ظ: "z",
  ع: "",
  غ: "gh",
  ف: "f",
  ق: "q",
  ك: "k",
  ل: "l",
  م: "m",
  ن: "n",
  ه: "h",
  و: "w",
  ى: "a",
  ي: "y",
  پ: "p",
  چ: "ch",
  گ: "g",
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

const ARABIC = /[؀-ۿ]/u;
const DIACRITICS = /[ً-ٰٟـ]/gu;
const NOT_SLUG = /[^a-z0-9]+/gu;
const EDGES = /^-+|-+$/gu;
const MARKS = /\p{M}/gu;
const SPACES = /\s+/u;
const ARTICLE = /^ال(?=.)/u;
const ADDRESS = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

/** Longest address a title makes, before any date. */
const MAX = 60;

/** Arabic words in Latin letters: the glossary's first, then each letter. */
export const transliterate = (text: string) =>
  text
    .replace(DIACRITICS, "")
    .split(SPACES)
    .map((word) => {
      const bare = word.replace(ARTICLE, "");
      const known = GLOSSARY[word] ?? GLOSSARY[bare];
      if (known) {
        return known;
      }
      // The article stands apart, as in al-Mutanabbi.
      const article = bare === word ? "" : "al ";
      return article + [...bare].map((ch) => LETTERS[ch] ?? ch).join("");
    })
    .join(" ");

/**
 * The address a title makes: from the English title, or the Arabic one in
 * Latin letters when there's no English.
 */
export const slugFromTitle = (en: string, ar = "") => {
  const source = en.trim() || (ARABIC.test(ar) ? transliterate(ar) : ar);
  return source
    .normalize("NFKD")
    .replace(MARKS, "")
    .toLowerCase()
    .replace(NOT_SLUG, "-")
    .replace(EDGES, "")
    .slice(0, MAX)
    .replace(EDGES, "");
};

/**
 * An event's address: its title alone, /events/<title>, with no date, so
 * moving the event never stales it (the owner, Nov 22, 2026). The database
 * numbers a repeated title (writing-workshop-2; private.event_address).
 */
export const eventSlug = (en: string, ar: string) =>
  slugFromTitle(en, ar) || "event";

/** Whether an address follows the pattern: lowercase words and hyphens. */
export const isAddress = (slug: string) => ADDRESS.test(slug);
