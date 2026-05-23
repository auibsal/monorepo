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
        'relative flex min-h-[80vh] w-full flex-col items-center justify-center overflow-hidden bg-background p-8 text-foreground selection:bg-auib-red selection:text-white',
        isRtl ? 'rtl' : 'ltr'
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
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
          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: isHovering ? 0 : 1 }}
            transition={{ duration: 0.5, ease: 'circOut' }}
            className={cn(
              'absolute inset-0 z-10 bg-auib-charcoal',
              isRtl ? 'origin-right' : 'origin-left'
            )}
          />
        </div>

        {/* Redacted Message */}
        <div className="relative mb-12 max-w-xl">
          <p className="relative z-0 text-lg leading-relaxed font-medium opacity-90">{message}</p>
          <motion.div
            initial={{ scaleY: 1 }}
            animate={{ scaleY: isHovering ? 0 : 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: 'circOut' }}
            className="absolute inset-0 z-10 origin-top bg-auib-charcoal"
          />
        </div>

        {/* Action Button */}
        <button
          onClick={onAction}
          className="group relative overflow-hidden border-2 border-auib-charcoal bg-auib-charcoal px-8 py-4 font-mono text-sm font-bold tracking-widest text-white uppercase shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
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
