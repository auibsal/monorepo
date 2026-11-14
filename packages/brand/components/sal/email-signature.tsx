import { cn } from "../../lib/utils";

/**
 * The email signature for hello@auibsal.org and officers' Society email
 * (decisions §11), in the email's language only: the sender's name and
 * seat; the Society's name; the motto; the site and the handle; and the
 * paperless line. Arabic is its own edition, never under the English.
 */
const EMAIL_SIGNATURE = {
  ar: {
    links: "auibsal.org · @auibsal",
    motto: "والقرطاسُ والقلمُ.",
    paperless:
      "الأصل عندنا: بلا ورق. والكتب يُعاد استخدامها عبر «الفصل الثاني».",
    society: "جمعية الفنون والآداب في الجامعة الأمريكية",
  },
  en: {
    links: "auibsal.org · @auibsal",
    motto: "The paper and the pen.",
    paperless: "Paperless by default. Books reused through Second Chapter.",
    society: "AUIB Society of Arts and Letters",
  },
} as const;

/** The signature as plain text, one line each, for mail apps without HTML. */
export const emailSignatureText = (
  lang: "ar" | "en",
  name: string,
  seat: string
) => {
  const words = EMAIL_SIGNATURE[lang];
  return [
    name,
    seat,
    words.society,
    words.motto,
    words.links,
    words.paperless,
  ].join("\n");
};

interface EmailSignatureProps {
  readonly className?: string;
  readonly lang?: "ar" | "en";
  /**
   * The sender's full official name, as the site holds it: a signature
   * block never uses a short or credited name.
   */
  readonly name: string;
  /** The seat, as the glossary and the Council page name it. */
  readonly seat: string;
}

/**
 * The signature as it reads in the email: the name in Medium, the seat in
 * secondary text, a hairline, then the Society's lines; no logo, no colors
 * beyond the role tokens, no images.
 */
export const EmailSignature = ({
  className,
  lang = "en",
  name,
  seat,
}: EmailSignatureProps) => {
  const words = EMAIL_SIGNATURE[lang];
  return (
    <div
      className={cn("grid max-w-md gap-3 text-sm leading-relaxed", className)}
      dir={lang === "ar" ? "rtl" : "ltr"}
      lang={lang}
    >
      <div>
        <p className="font-medium">{name}</p>
        <p className="text-text-secondary">{seat}</p>
      </div>
      <div className="border-line border-t pt-3">
        <p>{words.society}</p>
        <p>{words.motto}</p>
        <p dir="ltr">{words.links}</p>
        <p className="text-text-secondary">{words.paperless}</p>
      </div>
    </div>
  );
};
