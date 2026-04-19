'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// --- CUSTOM INTERACTIVE DOMINO COMPONENT ---
const HeroDomino = () => {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRotation({ x: -y / 10, y: x / 10 });
  };

  const handleMouseLeave = () => setRotation({ x: 0, y: 0 });

  return (
    <div 
      className="relative w-64 h-96 md:w-80 md:h-[30rem] perspective-1000 mx-auto"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        className="w-full h-full absolute transition-transform duration-200 ease-out preserve-3d"
        style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}
      >
        {/* The Tile Body */}
        <div className="absolute inset-0 bg-white rounded-3xl shadow-[0_20px_50px_rgba(255,255,255,0.1)] border-8 border-gray-200 flex flex-col justify-between p-8 overflow-hidden">
          {/* Top Half: 6 */}
          <div className="grid grid-cols-2 grid-rows-3 gap-4 h-[40%]">
            <div className="bg-black rounded-full w-8 h-8 place-self-center shadow-inner"></div>
            <div className="bg-black rounded-full w-8 h-8 place-self-center shadow-inner"></div>
            <div className="bg-black rounded-full w-8 h-8 place-self-center shadow-inner"></div>
            <div className="bg-black rounded-full w-8 h-8 place-self-center shadow-inner"></div>
            <div className="bg-black rounded-full w-8 h-8 place-self-center shadow-inner"></div>
            <div className="bg-black rounded-full w-8 h-8 place-self-center shadow-inner"></div>
          </div>
          
          {/* The Brass Spinner (Middle Divider) */}
          <div className="h-2 w-full bg-black flex items-center justify-center rounded-full my-4">
            <div className="w-6 h-6 bg-yellow-600 rounded-full border-2 border-yellow-800 shadow-md"></div>
          </div>

          {/* Bottom Half: 2 */}
          <div className="grid grid-cols-2 grid-rows-3 gap-4 h-[40%] relative">
            <div className="bg-black rounded-full w-8 h-8 place-self-end col-start-2 row-start-1 shadow-inner"></div>
            <div className="bg-black rounded-full w-8 h-8 place-self-start col-start-1 row-start-3 shadow-inner"></div>
          </div>
        </div>
        
        {/* 3D Depth Shadow */}
        <div className="absolute inset-0 bg-black/20 rounded-3xl transform translate-y-4 translate-x-4 -z-10 blur-xl"></div>
      </div>
    </div>
  );
};

// --- MAIN HOMEPAGE PAGE ---
export default function FederationHomePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-red-600 selection:text-white font-sans overflow-x-hidden">
      
      {/* 1. TOP FEDERATION TICKER (FIFA/News Broadcast Style) */}
      <div className="bg-red-600 text-black font-mono text-xs md:text-sm font-bold uppercase tracking-widest whitespace-nowrap overflow-hidden border-b border-red-800 py-1.5 flex items-center">
        <div className="animate-marquee inline-block">
          <span className="mx-4">● LIVE: World Championship Qualifiers</span>
          <span className="mx-4">|</span>
          <span className="mx-4 text-white">Match #8432: PLAYER_ONE def. HUSSEIN (Domination - 142pts)</span>
          <span className="mx-4">|</span>
          <span className="mx-4">ENGINE UPDATE: IS-MCTS v1.0.4 Online</span>
          <span className="mx-4">|</span>
          <span className="mx-4 text-white">NEW GRANDMASTER: "The Architect" (ELO 2450)</span>
          <span className="mx-4">|</span>
          <span className="mx-4">● LIVE: World Championship Qualifiers</span>
        </div>
      </div>

      {/* 2. HERO SECTION (Postmodern Split) */}
      <main className="grid grid-cols-1 lg:grid-cols-2 min-h-[85vh] relative">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

        {/* Left: Typography & CTAs */}
        <div className="flex flex-col justify-center p-8 md:p-16 lg:p-24 z-10">
          <div className="inline-block border border-red-500 text-red-500 px-3 py-1 font-mono text-xs uppercase tracking-[0.3em] mb-6 w-fit">
            Sanctioned Play
          </div>
          <h2 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase leading-[0.9] tracking-tighter mb-6">
            Master <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">The Board.</span>
          </h2>
          <p className="text-gray-400 font-mono text-sm md:text-base max-w-md mb-10 leading-relaxed border-l border-white/20 pl-4">
            The official digital infrastructure for competitive Iraqi Dominoes. Powered by deterministic Rust logic and real-time multiplayer telemetry.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/arena" className="bg-red-600 text-white font-bold uppercase tracking-widest px-8 py-5 text-center hover:bg-red-700 transition-colors relative overflow-hidden group">
              <span className="relative z-10">Enter Arena</span>
              <div className="absolute inset-0 bg-white w-full h-full transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out mix-blend-difference"></div>
            </Link>
            <Link href="/rules" className="border border-white/20 text-white font-bold uppercase tracking-widest px-8 py-5 text-center hover:bg-white hover:text-black transition-colors">
              Read Regulations
            </Link>
          </div>
        </div>

        {/* Right: Interactive Postmodern Graphic */}
        <div className="flex items-center justify-center relative p-8 z-10 border-l border-white/5 bg-gradient-to-b from-transparent to-white/5">
          <HeroDomino />
          
          {/* Floating UI Elements simulating FIDE data */}
          <div className="absolute top-1/4 right-1/4 bg-black/80 backdrop-blur-sm border border-white/10 p-4 font-mono text-xs hidden md:block">
            <p className="text-red-500 mb-1">ENGINE EVAL</p>
            <p className="text-2xl font-light">+4.23</p>
            <p className="text-white/50">Depth: 10,000</p>
          </div>
          <div className="absolute bottom-1/4 left-1/4 bg-black/80 backdrop-blur-sm border border-white/10 p-4 font-mono text-xs hidden md:block">
            <p className="text-green-500 mb-1">TARGET LOCK</p>
            <p className="text-xl font-light">End: 6</p>
            <p className="text-white/50">Win Prob: 62.4%</p>
          </div>
        </div>
      </main>

      {/* 3. THE RANKINGS (FIFA Style Leaderboard preview) */}
      <section className="border-t border-white/10 bg-black relative">
        <div className="grid grid-cols-1 md:grid-cols-3">
          
          <div className="p-12 md:border-r border-white/10 flex flex-col justify-center">
            <h3 className="text-3xl font-black uppercase tracking-tighter mb-4">World<br/>Standings</h3>
            <p className="text-gray-400 font-mono text-sm mb-6">The definitive ELO leaderboard for sanctioned IDA play.</p>
            <Link href="/leaderboard" className="text-red-500 font-mono text-sm uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2">
              View Full Index →
            </Link>
          </div>

          <div className="col-span-2 p-0 md:p-12 overflow-x-auto">
            <table className="w-full font-mono text-sm text-left">
              <thead className="text-white/50 border-b border-white/10">
                <tr>
                  <th className="pb-4 px-4 font-normal">RANK</th>
                  <th className="pb-4 px-4 font-normal">PLAYER</th>
                  <th className="pb-4 px-4 font-normal">RATING</th>
                  <th className="pb-4 px-4 font-normal">WIN RATE</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer">
                  <td className="py-4 px-4 text-red-500 font-bold">#1</td>
                  <td className="py-4 px-4 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    THE_FOUNDER
                  </td>
                  <td className="py-4 px-4">2845</td>
                  <td className="py-4 px-4">68.2%</td>
                </tr>
                <tr className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
                  <td className="py-4 px-4 text-white/70">#2</td>
                  <td className="py-4 px-4">Jude_T</td>
                  <td className="py-4 px-4">2790</td>
                  <td className="py-4 px-4">64.1%</td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors cursor-pointer">
                  <td className="py-4 px-4 text-white/70">#3</td>
                  <td className="py-4 px-4">Remas_X</td>
                  <td className="py-4 px-4">2712</td>
                  <td className="py-4 px-4">61.5%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Required style for the marquee animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-block;
          white-space: nowrap;
          animation: marquee 25s linear infinite;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .perspective-1000 {
          perspective: 1000px;
        }
      `}} />
    </div>
  );
}
