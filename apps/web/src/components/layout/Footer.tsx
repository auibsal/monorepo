'use client';

import { motion } from 'framer-motion';

export function Footer() {
  return (
    <footer className="bg-[#111111] text-[#f8f8f8] py-12 md:py-24 px-6 md:px-12 overflow-hidden rounded-t-3xl md:rounded-t-[4rem]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 gap-8">
        <div className="max-w-md">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Preserving the Present</p>
          <p className="text-sm md:text-base leading-relaxed text-zinc-400">
            The Iraqi Curator is a digital preservation initiative focused on contemporary art, essays, and audiovisual history from Baghdad to the world.
          </p>
        </div>
        
        <div className="flex flex-col gap-2 text-xs font-bold uppercase tracking-[0.2em] text-right">
          <a href="mailto:contact@theideaiq.com" className="hover:text-amber-500 transition-colors">Contact</a>
          <a href="https://theideaiq.com" target="_blank" rel="noreferrer" className="hover:text-amber-500 transition-colors">The IDEA Group</a>
        </div>
      </div>

      <div className="border-t border-zinc-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500">
          &copy; {new Date().getFullYear()} The Iraqi Curator. All Rights Reserved.
        </p>
        <img src="/logo-samoon.png" alt="Samoon" className="w-8 h-8 opacity-20 grayscale" />
      </div>

      {/* Massive Typography */}
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, margin: "100px" }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="mt-12 md:mt-24 w-full flex justify-center"
      >
        <h2 className="text-[14vw] leading-[0.8] font-black uppercase tracking-tighter text-zinc-800/50 select-none text-center">
          Baghdad
        </h2>
      </motion.div>
    </footer>
  );
}
