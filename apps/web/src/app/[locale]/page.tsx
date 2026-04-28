'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Link } from '@/i18n/routing'; // <-- Using the new i18n Link
import { useTranslations } from 'next-intl';

export default function Home() {
  const t = useTranslations('Landing');

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-zinc-50 overflow-hidden">
      <div className="absolute inset-0 opacity-10 bg-[url('/noise.png')] mix-blend-overlay pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="z-10 flex flex-col items-center"
      >
        <div className="relative w-72 h-72 mb-10 hover:scale-105 transition-transform duration-700 ease-out">
          <Image 
            src="/logo-samosa.png" 
            alt="The Iraqi Curator" 
            fill 
            className="object-contain drop-shadow-2xl"
            priority
          />
        </div>

        <motion.h1 
          className="text-5xl md:text-8xl font-black tracking-tighter uppercase text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 1 }}
        >
          {t('title_prefix')} <span className="text-amber-500 italic font-serif">{t('title_highlight')}</span>
        </motion.h1>
        
        <p className="mt-8 text-sm md:text-base tracking-[0.3em] uppercase text-zinc-400">
          {t('subtitle')}
        </p>

        <div className="mt-16 flex flex-col md:flex-row gap-6">
          <Link href="/museum" className="group relative px-10 py-4 bg-zinc-900 border border-zinc-800 overflow-hidden">
            <div className="absolute inset-0 w-0 bg-amber-500 transition-all duration-500 ease-out group-hover:w-full"></div>
            <span className="relative z-10 uppercase tracking-widest text-xs font-bold text-amber-500 group-hover:text-zinc-950 transition-colors duration-500">
              {t('enter')}
            </span>
          </Link>
          <Link href="/blog" className="px-10 py-4 border border-zinc-800 hover:bg-zinc-900 transition-colors duration-500 flex items-center justify-center">
             <span className="uppercase tracking-widest text-xs text-zinc-300">{t('read')}</span>
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
