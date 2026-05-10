'use client';

import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { useEffect, useState, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';

interface Trail {
  x: number;
  y: number;
  id: number;
}

export default function InteractiveNotFound() {
  const t = useTranslations('NotFound');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const [trails, setTrails] = useState<Trail[]>([]);
  // Use a fixed default quote for SSR to avoid hydration errors
  const [quoteIndex, setQuoteIndex] = useState(1);
  const [isClient, setIsClient] = useState(false);
  const trailIdCounter = useRef(0);

  // Characters to float around (English/Arabic depending on locale)
  const floatingChars = isRtl
    ? ['أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي', '؟', '!']
    : ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '?', '!'];

  useEffect(() => {
    setIsClient(true);
    // Select a random quote (1 to 4) on the client
    setQuoteIndex(Math.floor(Math.random() * 4) + 1);

    const handleMouseMove = (e: MouseEvent) => {
      const newTrail = {
        x: e.clientX,
        y: e.clientY,
        id: trailIdCounter.current++,
      };

      setTrails((prev) => {
        const newTrails = [...prev, newTrail];
        if (newTrails.length > 20) {
          return newTrails.slice(newTrails.length - 20);
        }
        return newTrails;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Remove trails over time to create a fading effect
  useEffect(() => {
    if (trails.length === 0) return;
    const timer = setTimeout(() => {
      setTrails((prev) => prev.slice(1));
    }, 50);
    return () => clearTimeout(timer);
  }, [trails]);

  return (
    <div className="min-h-[70vh] flex flex-col items-start justify-start p-8 overflow-hidden relative bg-auib-white selection:bg-auib-red selection:text-white">

      {/* Ink Trail Effect */}
      {trails.map((trail, index) => (
        <motion.div
          key={trail.id}
          initial={{ opacity: 0.5, scale: 1 }}
          animate={{ opacity: 0, scale: 0 }}
          transition={{ duration: 1 }}
          className="pointer-events-none fixed z-50 rounded-full bg-auib-red/30 mix-blend-multiply"
          style={{
            left: trail.x,
            top: trail.y,
            width: 30 + (index % 10) * 2,
            height: 30 + (index % 10) * 2,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}

      {/* Floating Letters Background - Only render on client to avoid hydration mismatch with random initial positions */}
      {isClient && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                opacity: 0,
                rotate: Math.random() * 360
              }}
              animate={{
                y: [null, Math.random() * window.innerHeight],
                x: [null, Math.random() * window.innerWidth],
                opacity: [0, 0.1, 0],
                rotate: [null, Math.random() * 360 + 180]
              }}
              transition={{
                duration: 10 + Math.random() * 20,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute text-4xl md:text-6xl font-serif text-black/5 select-none"
            >
              {floatingChars[Math.floor(Math.random() * floatingChars.length)]}
            </motion.div>
          ))}
        </div>
      )}

      <div className="relative z-20 w-48 h-48 md:w-64 md:h-64 mb-8">
        <Image src="/logo-samoon.png" alt="Lost Page" fill className="object-contain opacity-50 grayscale mix-blend-multiply drop-shadow-xl" />
      </div>

      <div className="absolute inset-0 flex flex-col items-start justify-start z-10 pointer-events-none p-8">
        <h1 className="text-[10rem] md:text-[15rem] font-black text-black/5 leading-none select-none text-start tracking-tighter">
          {t('title')}
        </h1>
      </div>

      <div className="relative z-30 flex flex-col items-start w-full max-w-2xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4 text-[#111111] text-start"
        >
          {t('heading')}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base md:text-lg tracking-widest text-zinc-600 mb-6 leading-relaxed text-start"
        >
          {t('description')}
        </motion.p>

        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ duration: 1, delay: 0.8 }}
           className="pl-4 rtl:pl-0 rtl:pr-4 border-l-2 rtl:border-l-0 rtl:border-r-2 border-auib-red/30 italic text-zinc-500 mb-10 text-start"
        >
          &quot;{isClient ? t(`quotes.q${quoteIndex}`) : t('quotes.q1')}&quot;
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="inline-block self-start"
        >
          <Link
            href="/"
            className="inline-block border border-auib-red text-auib-red px-8 py-4 text-sm font-bold uppercase tracking-[0.2em] hover:bg-auib-red hover:text-white transition-all duration-300 shadow-[4px_4px_0px_0px_rgba(185,28,28,0.2)] hover:shadow-none translate-x-0 hover:translate-x-[4px] hover:translate-y-[4px]"
          >
            {t('returnHome')}
          </Link>
        </motion.div>
      </div>

      {/* Draggable ink blots for extra interactivity - Only render on client to avoid random initial positions hydration error */}
      {isClient && (
        <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={`blot-${i}`}
              drag
              dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
              className="absolute rounded-full bg-black/10 mix-blend-multiply cursor-grab active:cursor-grabbing pointer-events-auto backdrop-blur-sm"
              style={{
                width: 50 + Math.random() * 100,
                height: 50 + Math.random() * 100,
                left: `${20 + Math.random() * 60}%`,
                top: `${20 + Math.random() * 60}%`,
                filter: 'blur(8px)',
              }}
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(185,28,28,0.15)' }}
              whileTap={{ scale: 0.9 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
