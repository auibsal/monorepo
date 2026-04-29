'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from '@/i18n/routing';

export default function Home() {
  const containerRef = useRef(null);
  
  // Connect to the scroll position to create parallax effects
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Layer speeds: some move up fast, some move slow, some go down
  const yText = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]);
  const yImage1 = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const yImage2 = useTransform(scrollYProgress, [0, 1], ["10%", "-80%"]);
  const yLogo = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <main ref={containerRef} className="min-h-[250vh] bg-[#f8f8f8] text-[#111111] overflow-hidden relative">
      
      {/* ================= HERO COLLAGE ================= */}
      <section className="h-screen w-full relative pt-32 px-4 md:px-8">
        
        {/* Layer 1: Massive Background Text */}
        <motion.div style={{ y: yText }} className="relative z-20 pointer-events-none mix-blend-difference text-white">
          <h1 className="text-[18vw] leading-[0.75] font-black uppercase tracking-tighter flex flex-col">
            <span>The Iraqi</span>
            <span className="ml-[10vw]">Curator</span>
            <span className="ml-[5vw] text-[10vw] text-zinc-400">Est. 2026</span>
          </h1>
        </motion.div>

        {/* Layer 2: Collage Image 1 (Floating left) */}
        <motion.div style={{ y: yImage1 }} className="absolute top-[30%] left-[5%] md:left-[10%] w-[50vw] md:w-[25vw] aspect-[3/4] z-10">
          <img 
            src="https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1000&auto=format&fit=crop" 
            alt="Abstract Art" 
            className="w-full h-full object-cover grayscale opacity-80"
          />
          {/* "Tape" piece */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-amber-600/60 backdrop-blur-sm rotate-2" />
        </motion.div>

        {/* Layer 3: Collage Image 2 (Floating right, moves opposite direction) */}
        <motion.div style={{ y: yImage2 }} className="absolute top-[50%] right-[5%] md:right-[15%] w-[40vw] md:w-[20vw] aspect-square z-0">
          <img 
            src="https://images.unsplash.com/photo-1555580399-5287fbd521e6?q=80&w=1000&auto=format&fit=crop" 
            alt="Architecture" 
            className="w-full h-full object-cover grayscale"
          />
        </motion.div>

        {/* Layer 4: The Samoon Logo acting as a sticker */}
        <motion.div style={{ y: yLogo }} className="absolute top-[20%] right-[10%] md:right-[30%] z-30">
          <img 
            src="/logo-samoon.png" 
            alt="Taped Samoon" 
            className="w-32 md:w-64 rotate-[-15deg] drop-shadow-2xl"
          />
        </motion.div>

        {/* Layer 5: Utilitarian Text Block */}
        <div className="absolute bottom-[10%] left-4 md:left-12 max-w-sm z-30 mix-blend-difference text-white">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] border-l-2 border-amber-600 pl-4">
            Audiovisual preservation of contemporary art, culture, and intellect from Baghdad to the world. A digital brutalist archive.
          </p>
        </div>
      </section>

      {/* ================= PORTALS (MUSEUM & CURATIONS) ================= */}
      <section className="relative w-full min-h-screen pt-48 pb-32 flex flex-col gap-48 z-40">
        
        {/* MUSEUM LINK */}
        <div className="w-full flex justify-start px-4 md:px-12">
          <Link href="/museum" className="group relative block w-full md:w-auto">
            {/* Hover Image Reveal */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[150%] z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
               <img src="https://images.unsplash.com/photo-1574344406275-65d1d60db2a4?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover grayscale contrast-150" alt="Museum" />
            </div>

            {/* Brutalist Text */}
            <h2 className="text-[15vw] md:text-[10vw] leading-none font-black uppercase tracking-tighter relative z-10 mix-blend-difference text-white group-hover:text-amber-600 transition-colors duration-500">
              Digital<br/>Museum
            </h2>

            {/* Overlapping Brutalist Sticker */}
            <div className="absolute -bottom-8 -right-4 md:-right-12 bg-amber-600 text-[#111111] px-6 py-4 rotate-[-5deg] z-20 group-hover:rotate-0 transition-transform duration-300">
              <span className="text-xs font-black uppercase tracking-widest">Enter Exhibit [01]</span>
            </div>
          </Link>
        </div>

        {/* CURATIONS LINK */}
        <div className="w-full flex justify-end px-4 md:px-24">
          <Link href="/blog" className="group relative block w-full md:w-auto text-right">
            {/* Hover Image Reveal */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[150%] z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
               <img src="https://images.unsplash.com/photo-1455390582262-044cdead2708?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover grayscale contrast-150" alt="Curations" />
            </div>

            {/* Brutalist Text */}
            <h2 className="text-[15vw] md:text-[10vw] leading-none font-black uppercase tracking-tighter relative z-10 mix-blend-difference text-white group-hover:text-amber-600 transition-colors duration-500">
              Curations<br/>Archive
            </h2>

            {/* Overlapping Brutalist Sticker */}
            <div className="absolute -top-12 -left-4 md:-left-12 bg-[#111111] text-[#f8f8f8] px-6 py-4 rotate-[8deg] z-20 group-hover:rotate-0 transition-transform duration-300">
              <span className="text-xs font-black uppercase tracking-widest">Read Essays [02]</span>
            </div>
          </Link>
        </div>

      </section>

      {/* Decorative background tape across the bottom */}
      <div className="absolute bottom-32 left-0 w-[150vw] h-24 bg-amber-600/20 rotate-3 z-0 backdrop-blur-md pointer-events-none" />
      <div className="absolute bottom-12 left-0 w-[150vw] h-12 bg-black/5 -rotate-2 z-0 backdrop-blur-md pointer-events-none" />

    </main>
  );
}
