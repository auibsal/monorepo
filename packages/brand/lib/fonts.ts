import { cn } from "@repo/brand/lib/utils";
import {
  Markazi_Text,
  Mrs_Saint_Delafield,
  Ubuntu,
  Ubuntu_Mono,
} from "next/font/google";
import localFont from "next/font/local";

/**
 * SAL type: Ubuntu for everything on screen, in both languages, Light (300,
 * with its italic) for display, Regular for text, Medium (500) for labels
 * and links, Bold for emphasis inside a sentence; Ubuntu Mono for codes;
 * Markazi Text for the body of Qirtas's pieces, English and Arabic.
 *
 * Ubuntu is one family (decisions §14): the Latin files come from Google
 * Fonts and the Arabic files are the brand's own (packages/brand/assets/
 * fonts), served with an Arabic unicode-range, so a line of Arabic takes
 * the Arabic files and nothing else does. The Arabic files have no Light
 * or Medium: 300 and 400 use the Regular file, 500 and 700 the Bold.
 *
 * One more face, for signatures only (decisions.md): a person's
 * name, signed, is set in Mrs Saint Delafield (`font-signature`, the
 * `Signature` component), never for text.
 */
const ubuntu = Ubuntu({
  display: "swap",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-ubuntu",
  weight: ["300", "400", "500", "700"],
});

const ubuntuArabic = localFont({
  // Arabic, its supplements and presentation forms (a literal: next/font
  // reads its options at build time).
  declarations: [
    {
      prop: "unicode-range",
      value: "U+0600-06FF, U+0750-077F, U+0870-08FF, U+FB50-FDFF, U+FE70-FEFF",
    },
  ],
  // Arabic waits for its own (preloaded) face rather than showing a
  // system one first: the system's Arabic (DejaVu on Linux and Android)
  // drew the line in another face before Ubuntu arrived.
  adjustFontFallback: false,
  display: "block",
  fallback: [],
  src: [
    { path: "../assets/fonts/UbuntuArabic-Regular.woff2", style: "normal", weight: "300" },
    { path: "../assets/fonts/UbuntuArabic-Regular.woff2", style: "normal", weight: "400" },
    { path: "../assets/fonts/UbuntuArabic-Bold.woff2", style: "normal", weight: "500" },
    { path: "../assets/fonts/UbuntuArabic-Bold.woff2", style: "normal", weight: "700" },
  ],
  variable: "--font-ubuntu-arabic",
});

const ubuntuMono = Ubuntu_Mono({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-ubuntu-mono",
  weight: ["400", "700"],
});

const markazi = Markazi_Text({
  display: "swap",
  subsets: ["arabic", "latin"],
  variable: "--font-markazi",
});

const signature = Mrs_Saint_Delafield({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-mrs-saint",
  weight: "400",
});

export const fonts = cn(
  signature.variable,
  ubuntu.variable,
  ubuntuArabic.variable,
  ubuntuMono.variable,
  markazi.variable,
  "touch-manipulation font-sans antialiased"
);
