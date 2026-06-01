import { Ubuntu } from 'next/font/google';
import localFont from 'next/font/local';

/**
 * ubuntu
 *
 * @description Standardized execution for ubuntu.
 */
export const ubuntu = Ubuntu({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-ubuntu',
  display: 'swap', // CRITICAL: Added for instant text rendering
});

/**
 * ubuntuArabic
 *
 * @description Standardized execution for ubuntuArabic.
 */
export const ubuntuArabic = localFont({
  src: [
    {
      path: './UbuntuArabic-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './UbuntuArabic-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-ubuntu-arabic',
  display: 'swap', // CRITICAL: Added for instant text rendering
});
