'use client';

import { useEffect, useState } from 'react';

import { motion } from 'framer-motion';

import { cn } from '../lib/utils';

// Optional: if you want to use it for class merging

interface ErrorProps {
  code: string;
  title: string;
  message: string;
  actionText: string;
  onAction: () => void;
  isRtl?: boolean;
}

export default function InteractiveErrorState({
  code,
  title,
  message,
  actionText,
  onAction,
  isRtl = false,
}: ErrorProps) {
  const [isHovering, setIsHovering] = useState(false);

  // 1. Hydration Guard State
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div
      className={cn(
        'bg-background text-foreground selection:bg-auib-red relative flex min-h-[80vh] w-full flex-col items-center justify-center overflow-hidden p-8 selection:text-white',
        isRtl ? 'rtl' : 'ltr'
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="border-auib-charcoal shadow-brutalist-md relative z-10 w-full max-w-3xl border-4 bg-white p-8 text-start transition-transform duration-500 ease-out hover:scale-[1.01] md:p-16">
        <div className="border-auib-charcoal mb-6 flex items-end justify-between border-b-4 pb-4">
          <span className="text-auib-red font-mono text-xl font-bold uppercase tracking-widest">
            {code}
          </span>
          <span className="font-mono text-xs uppercase opacity-50">System Directive</span>
        </div>

        {/* Redacted Title */}
        <div className="relative mb-6 inline-block">
          <h1 className="text-auib-charcoal relative z-0 font-serif text-5xl font-black uppercase md:text-7xl">
            {title}
          </h1>
          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: isHovering ? 0 : 1 }}
            transition={{ duration: 0.5, ease: 'circOut' }}
            className={cn(
              'bg-auib-charcoal absolute inset-0 z-10',
              isRtl ? 'origin-right' : 'origin-left'
            )}
          />
        </div>

        {/* Redacted Message */}
        <div className="relative mb-12 max-w-xl">
          <p className="relative z-0 text-lg font-medium leading-relaxed opacity-90">{message}</p>
          <motion.div
            initial={{ scaleY: 1 }}
            animate={{ scaleY: isHovering ? 0 : 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: 'circOut' }}
            className="bg-auib-charcoal absolute inset-0 z-10 origin-top"
          />
        </div>

        {/* Action Button */}
        <button
          onClick={onAction}
          className="border-auib-charcoal bg-auib-charcoal group relative overflow-hidden border-2 px-8 py-4 font-mono text-sm font-bold uppercase tracking-widest text-white shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
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

      {/* 2. Hydration-Safe Background Noise */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-[0.03]">
        {isMounted &&
          [...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute select-none font-serif text-9xl font-black"
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
