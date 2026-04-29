'use client';

import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f8f8f8] text-[#111111]">
      {/* HERO SECTION */}
      <section className="min-h-[90vh] flex flex-col justify-center px-6 md:px-12 pt-24 pb-12 relative overflow-hidden">
        
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="z-10 mt-auto"
        >
          <h1 className="text-[16vw] md:text-[11vw] leading-[0.8] font-black uppercase tracking-tighter flex flex-col">
            <span className="text-zinc-400">The Iraqi</span>
            <span>Curator</span>
          </h1>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="mt-8 md:mt-16 max-w-sm mb-auto"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600 mb-2">Established 2026</p>
          <p className="text-sm text-zinc-600 leading-relaxed font-medium">
            An audiovisual preservation of contemporary art, culture, and intellect from Baghdad to the world.
          </p>
        </motion.div>
      </section>

      {/* DYNAMIC PORTAL SECTION */}
      <section className="py-24 px-6 md:px-12 border-t border-zinc-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24">
          
          <Link href="/museum" className="group relative block overflow-hidden">
            <div className="aspect-square md:aspect-[4/5] bg-zinc-200 relative overflow-hidden">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1574344406275-65d1d60db2a4?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center grayscale group-hover:grayscale-0 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
            </div>
            <div className="mt-6 flex justify-between items-end">
              <div>
                <span className="text-[10px] text-amber-600 font-bold uppercase tracking-[0.2em]">01</span>
                <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mt-1 group-hover:text-amber-600 transition-colors duration-300">Digital Museum</h2>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 border-b border-zinc-500 pb-1">Enter</span>
            </div>
          </Link>

          <Link href="/blog" className="group relative block overflow-hidden mt-8 md:mt-32">
            <div className="aspect-square md:aspect-[4/5] bg-zinc-200 relative overflow-hidden">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1455390582262-044cdead2708?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center grayscale group-hover:grayscale-0 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
            </div>
            <div className="mt-6 flex justify-between items-end">
              <div>
                <span className="text-[10px] text-amber-600 font-bold uppercase tracking-[0.2em]">02</span>
                <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mt-1 group-hover:text-amber-600 transition-colors duration-300">Curations</h2>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 border-b border-zinc-500 pb-1">Read</span>
            </div>
          </Link>

        </div>
      </section>
    </main>
  );
}
