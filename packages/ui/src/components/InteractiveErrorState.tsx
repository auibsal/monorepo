'use client';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface ErrorProps {
  code: string;
  title: string;
  message: string;
  actionText: string;
  onAction: () => void;
  isRtl?: boolean;
}

export default function InteractiveErrorState({ code, title, message, actionText, onAction, isRtl = false }: ErrorProps) {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div 
      className={`relative flex min-h-[80vh] w-full flex-col items-center justify-center bg-background p-8 text-foreground selection:bg-auib-red selection:text-white ${isRtl ? 'rtl' : 'ltr'}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="relative z-10 max-w-3xl border-4 border-auib-charcoal bg-white p-8 md:p-16 shadow-brutalist-md text-start w-full">
        
        <div className="mb-6 border-b-4 border-auib-charcoal pb-4 flex justify-between items-end">
          <span className="font-mono text-xl font-bold uppercase tracking-widest text-auib-red">
            {code}
          </span>
          <span className="font-mono text-xs opacity-50 uppercase">
            System Directive
          </span>
        </div>

        {/* Redacted Title */}
        <div className="relative mb-6 inline-block">
          <h1 className="font-serif text-5xl font-black uppercase md:text-7xl text-auib-charcoal relative z-0">
            {title}
          </h1>
          <motion.div 
            initial={{ scaleX: 1 }}
            animate={{ scaleX: isHovering ? 0 : 1 }}
            transition={{ duration: 0.5, ease: "circOut" }}
            className={`absolute inset-0 z-10 bg-auib-charcoal origin-${isRtl ? 'right' : 'left'}`}
          />
        </div>

        {/* Redacted Message */}
        <div className="relative mb-12 max-w-xl">
          <p className="text-lg font-medium leading-relaxed opacity-90 relative z-0">
            {message}
          </p>
          <motion.div 
            initial={{ scaleY: 1 }}
            animate={{ scaleY: isHovering ? 0 : 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "circOut" }}
            className="absolute inset-0 z-10 bg-auib-charcoal origin-top"
          />
        </div>

        {/* Action Button */}
        <button 
          onClick={onAction}
          className="group relative overflow-hidden border-2 border-auib-charcoal bg-auib-charcoal px-8 py-4 font-mono text-sm font-bold uppercase tracking-widest text-white transition-all hover:shadow-none hover:translate-y-1 hover:translate-x-1"
        >
          <span className="relative z-10 mix-blend-difference">{actionText}</span>
          <motion.div 
            className="absolute inset-0 z-0 bg-white"
            initial={{ y: "100%" }}
            whileHover={{ y: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          />
        </button>

      </div>

      {/* Floating Background Noise */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-[0.03]">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute font-serif text-9xl font-black select-none"
            initial={{ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight }}
            animate={{ y: [null, Math.random() * window.innerHeight] }}
            transition={{ duration: 20 + Math.random() * 20, repeat: Infinity, ease: "linear" }}
          >
            {code}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
