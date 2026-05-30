'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { cn } from '../lib/utils';

interface ErrorProps {
  code: string;
  title: string;
  message: string;
  actionText: string;
  onAction: () => void;
  isRtl?: boolean;
}

export function InteractiveErrorState({
  code,
  title,
  message,
  actionText,
  onAction,
  isRtl = false,
}: ErrorProps) {
  // Hydration Guard State
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div
      // 1. Native DOM Directionality attribute for perfect BiDi rendering
      dir={isRtl ? 'rtl' : 'ltr'}
      className="group relative flex min-h-[80vh] w-full flex-col items-center justify-center overflow-hidden bg-background p-8 text-foreground selection:bg-auib-red selection:text-white"
    >
      <div className="relative z-10 w-full max-w-3xl border-4 border-auib-charcoal bg-white p-8 text-start shadow-brutalist-md transition-transform duration-500 ease-out hover:scale-[1.01] md:p-16">
        <div className="mb-6 flex items-end justify-between border-b-4 border-auib-charcoal pb-4">
          <span className="font-mono text-xl font-bold tracking-widest text-auib-red uppercase">
            {code}
          </span>
          <span className="font-mono text-xs uppercase opacity-50">System Directive</span>
        </div>

        {/* Redacted Title */}
        <div className="relative mb-6 inline-block">
          <h1 className="relative z-0 font-serif text-5xl font-black text-auib-charcoal uppercase md:text-7xl">
            {title}
          </h1>
          <div
            className={cn(
              'absolute inset-0 z-10 bg-auib-charcoal transition-transform duration-500 ease-out group-hover:scale-x-0',
              isRtl ? 'origin-right' : 'origin-left',
            )}
          />
        </div>

        {/* Redacted Message */}
        <div className="relative mb-12 max-w-xl">
          <p className="relative z-0 text-lg font-medium leading-relaxed opacity-90">{message}</p>
          <div className="absolute inset-0 z-10 origin-top bg-auib-charcoal transition-transform delay-100 duration-500 ease-out group-hover:scale-y-0" />
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onAction}
          // 2. Synchronized with Tailwind v4 Brutalist Design Tokens
          className="group relative overflow-hidden border-2 border-auib-charcoal bg-auib-charcoal px-8 py-4 font-mono text-sm font-bold tracking-widest text-white uppercase shadow-brutalist-sm transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auib-red focus-visible:ring-offset-2"
        >
          <span className="relative z-10 mix-blend-difference">{actionText}</span>
          <motion.div
            className="absolute inset-0 z-0 bg-white"
            initial={{ y: '100%' }}
            whileHover={{ y: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          />
        </button>
      </div>

      {/* Hydration-Safe Background Noise */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-[0.03]">
        {isMounted &&
          [...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute font-serif text-9xl font-black select-none"
              initial={{
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
              }}
              animate={{
                y: [null, Math.random() * window.innerHeight],
              }}
              transition={{
                duration: 20 + Math.random() * 20,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              {code}
            </motion.div>
          ))}
      </div>
    </div>
  );
}
