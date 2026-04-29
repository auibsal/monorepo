'use client';

import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f8f8f8] text-[#111111]">
      {/* HERO SECTION */}
      <section className="h-screen flex flex-col justify-center px-6 md:px-12 relative overflow-hidden">
        <div className="absolute top-12 left-6 md:left-12">
          <img src="/logo-samoon.png" alt="TIC" className="w-16 h-16" />
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} // Custom easing for premium feel
          className="z-10"
        >
          <h1 className="text-[12vw] leading-[0.85] font-black uppercase tracking-tighter flex flex-col">
            <span className="text-zinc-400">The Iraqi</span>
            <span>Curator</span>
          </h1>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="absolute bottom-12 right-6 md:right-12 max-w-xs text-right"
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600 mb-2">Established 2026</p>
          <p className="text-sm text-zinc-600 leading-relaxed">
            An audiovisual preservation of contemporary art, culture, and intellect from Baghdad to the world.
          </p>
        </motion.div>
      </section>

      {/* DYNAMIC PORTAL SECTION */}
      <section className="py-32 px-6 md:px-12 border-t border-zinc-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24">
          
          <Link href="/museum" className="group relative block overflow-hidden">
            <div className="aspect-[4/5] bg-zinc-200 relative overflow-hidden">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1574344406275-65d1d60db2a4?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center grayscale group-hover:grayscale-0 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500" />
            </div>
            <div className="mt-8 flex justify-between items-end">
              <div>
                <span className="text-[10px] text-amber-600 font-bold uppercase tracking-[0.2em]">01</span>
                <h2 className="text-4xl font-black uppercase tracking-tighter mt-2 group-hover:text-amber-600 transition-colors duration-300">Digital Museum</h2>
              </div>
              <span className="text-xs uppercase tracking-widest text-zinc-500 border-b border-zinc-500 pb-1">Enter</span>
            </div>
          </Link>

          <Link href="/blog" className="group relative block overflow-hidden mt-12 md:mt-32">
            <div className="aspect-[4/5] bg-zinc-200 relative overflow-hidden">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1455390582262-044cdead2708?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center grayscale group-hover:grayscale-0 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500" />
            </div>
            <div className="mt-8 flex justify-between items-end">
              <div>
                <span className="text-[10px] text-amber-600 font-bold uppercase tracking-[0.2em]">02</span>
                <h2 className="text-4xl font-black uppercase tracking-tighter mt-2 group-hover:text-amber-600 transition-colors duration-300">Curations Archive</h2>
              </div>
              <span className="text-xs uppercase tracking-widest text-zinc-500 border-b border-zinc-500 pb-1">Read</span>
            </div>
          </Link>

        </div>
      </section>
    </main>
  );
}
