'use client';

import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function NotFound() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate mouse position relative to center of screen
      setMousePosition({
        x: (e.clientX - window.innerWidth / 2) / 20,
        y: (e.clientY - window.innerHeight / 2) / 20,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 overflow-hidden relative bg-auib-white">
      <motion.div 
        animate={{ x: mousePosition.x, y: mousePosition.y }}
        transition={{ type: 'spring', damping: 15 }}
        className="relative z-10 w-48 h-48 md:w-64 md:h-64"
      >
        <Image src="/logo-samoon.png" alt="Lost Page" fill className="object-contain opacity-50 grayscale mix-blend-multiply" />
      </motion.div>

      <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
        <h1 className="text-[10rem] md:text-[15rem] font-black text-black/5 leading-none">404</h1>
      </div>

      <div className="relative z-30 text-center mt-12">
        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4 text-[#111111]">Page not found.</h2>
        <p className="text-sm tracking-widest uppercase text-zinc-500 mb-8 max-w-md mx-auto leading-relaxed">
          The requested page could not be found.
        </p>
        <Link href="/" className="inline-block border border-auib-red text-auib-red px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-auib-red hover:text-white transition-colors duration-300">
          Return Home
        </Link>
      </div>
    </div>
  );
}
