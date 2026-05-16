 import { Ubuntu } from 'next/font/google';
   import localFont from 'next/font/local';

   export const ubuntu = Ubuntu({
     weight: ['300', '400', '500', '700'],
     subsets: ['latin'],
     variable: '--font-ubuntu'
   });

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
       }
     ],
     variable: '--font-ubuntu-arabic'
   });
