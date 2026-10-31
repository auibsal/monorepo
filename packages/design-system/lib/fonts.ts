import { cn } from "@repo/design-system/lib/utils";
import {
  Literata,
  Mrs_Saint_Delafield,
  Ubuntu,
  Ubuntu_Mono,
} from "next/font/google";
import localFont from "next/font/local";

/**
 * SAL type: Ubuntu for everything on screen, Light (300, with its
 * italic) for display, Regular for text, Medium (500) for labels and links,
 * Bold for emphasis inside a sentence; Ubuntu Mono for codes; Literata for
 * Qirtas's article text (dek and body) only.
 *
 * Ubuntu Arabic (400/700) is self-hosted with next/font/local from
 * ../fonts, byte-for-byte copies of brand/fonts (tokens.test.ts checks).
 * Never another Arabic face. It has no Light: Arabic display is Regular.
 *
 * One more face, for signatures only (owner, Oct 31, 2026): a person's
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

const ubuntuMono = Ubuntu_Mono({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-ubuntu-mono",
  weight: ["400", "700"],
});

const ubuntuArabic = localFont({
  display: "swap",
  src: [
    { path: "../fonts/UbuntuArabic-Regular.woff2", style: "normal", weight: "400" },
    { path: "../fonts/UbuntuArabic-Bold.woff2", style: "normal", weight: "700" },
  ],
  variable: "--font-ubuntu-arabic",
});

const literata = Literata({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-literata",
  weight: ["400", "500"],
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
  ubuntuMono.variable,
  ubuntuArabic.variable,
  literata.variable,
  "touch-manipulation font-sans antialiased"
);
