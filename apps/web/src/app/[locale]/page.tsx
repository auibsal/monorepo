'use client';

import { useState, useEffect } from 'react';
import { Link } from '@/i18n/routing';

// --- LIGHT MODE INTERACTIVE DOMINO ---
const LightDomino = () => {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRotation({ x: -y / 15, y: x / 15 });
  };

  const handleMouseLeave = () => setRotation({ x: 0, y: 0 });

  return (
    <div 
      className="relative w-72 h-[26rem] md:w-96 md:h-[36rem] perspective-1000 mx-auto z-20 group"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        className="w-full h-full absolute transition-transform duration-300 ease-out preserve-3d group-hover:scale-105"
        style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}
      >
        <div className="absolute inset-0 bg-white rounded-sm shadow-[20px_40px_60px_rgba(0,0,0,0.15)] border-[8px] border-[#f0f0f0] flex flex-col justify-between p-10 overflow-hidden">
          {/* Top Half: 6 */}
          <div className="grid grid-cols-2 grid-rows-3 gap-6 h-[40%]">
            <div className="bg-[#111] rounded-full w-10 h-10 place-self-center shadow-[inset_0_4px_6px_rgba(0,0,0,0.8)]"></div>
            <div className="bg-[#111] rounded-full w-10 h-10 place-self-center shadow-[inset_0_4px_6px_rgba(0,0,0,0.8)]"></div>
            <div className="bg-[#111] rounded-full w-10 h-10 place-self-center shadow-[inset_0_4px_6px_rgba(0,0,0,0.8)]"></div>
            <div className="bg-[#111] rounded-full w-10 h-10 place-self-center shadow-[inset_0_4px_6px_rgba(0,0,0,0.8)]"></div>
            <div className="bg-[#111] rounded-full w-10 h-10 place-self-center shadow-[inset_0_4px_6px_rgba(0,0,0,0.8)]"></div>
            <div className="bg-[#111] rounded-full w-10 h-10 place-self-center shadow-[inset_0_4px_6px_rgba(0,0,0,0.8)]"></div>
          </div>
          
          {/* The Brass Spinner */}
          <div className="h-2 w-full bg-gray-200 flex items-center justify-center my-6 relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]">
            <div className="absolute w-8 h-8 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full border-4 border-white shadow-md"></div>
          </div>

          {/* Bottom Half: 2 */}
          <div className="grid grid-cols-2 grid-rows-3 gap-6 h-[40%] relative">
            <div className="bg-[#111] rounded-full w-10 h-10 place-self-end col-start-2 row-start-1 shadow-[inset_0_4px_6px_rgba(0,0,0,0.8)]"></div>
            <div className="bg-[#111] rounded-full w-10 h-10 place-self-start col-start-1 row-start-3 shadow-[inset_0_4px_6px_rgba(0,0,0,0.8)]"></div>
          </div>
        </div>
        {/* Extreme Light-Mode Depth Shadow */}
        <div className="absolute inset-0 bg-red-600/10 rounded-sm transform translate-y-12 translate-x-12 -z-10 blur-3xl group-hover:bg-red-600/20 transition-colors duration-500"></div>
      </div>
    </div>
  );
};

export default function Home() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#0a0a0a] selection:bg-red-600 selection:text-white font-sans overflow-hidden relative">
      
      {/* Light Mode Spotlight Tracking */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300 mix-blend-multiply"
        style={{
          background: `radial-gradient(circle 800px at ${mousePos.x}px ${mousePos.y}px, rgba(0,0,0,0.02), transparent 80%)`
        }}
      />

      {/* FEDERATION TICKER */}
      <div className="bg-[#0a0a0a] text-white font-mono text-xs font-bold uppercase tracking-[0.2em] whitespace-nowrap overflow-hidden py-2.5 relative z-10 border-b-4 border-red-600">
        <div className="animate-marquee inline-block">
          <span className="mx-6 text-red-500">● OFFICIAL I.D.A. SANCTIONED EVENT</span>
          <span className="mx-6">|</span>
          <span className="mx-6">FEDERATION NOTICE: BONE-YARD PROTOCOLS ENFORCED</span>
          <span className="mx-6">|</span>
          <span className="mx-6 text-red-500">RANKINGS UPDATE: WORLD CHAMPIONSHIP QUALIFIERS</span>
          <span className="mx-6">|</span>
          <span className="mx-6">IS-MCTS ENGINE V1.0 MAINTAINS 99.8% ACCURACY</span>
          <span className="mx-6">|</span>
        </div>
      </div>

      <main className="relative z-10 flex flex-col lg:flex-row min-h-[90vh] max-w-[1600px] mx-auto">
        {/* Architectural Light Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none z-0"></div>

        {/* LEFT: Typography & Authority */}
        <div className="flex-1 flex flex-col justify-center p-8 md:p-16 lg:p-24 relative z-10 lg:border-r border-black/10">
          <div className="flex items-center gap-4 mb-8">
            <span className="w-8 h-[2px] bg-red-600"></span>
            <span className="text-red-600 font-mono text-xs font-bold uppercase tracking-[0.4em]">The Governing Body</span>
          </div>

          <h2 className="text-6xl md:text-8xl lg:text-[7.5rem] font-black uppercase leading-[0.85] tracking-tighter mb-8 relative">
            <span className="text-transparent [-webkit-text-stroke:2px_rgba(0,0,0,0.15)] block hover:[-webkit-text-stroke:2px_black] transition-colors duration-500">Preserve</span>
            <span className="text-[#0a0a0a] block">The Heritage.</span>
            <span className="text-transparent [-webkit-text-stroke:2px_rgba(0,0,0,0.15)] block hover:[-webkit-text-stroke:2px_black] transition-colors duration-500">Master</span>
            <span className="text-[#0a0a0a] block">The Board.</span>
          </h2>

          <p className="text-black/60 font-mono text-sm md:text-base max-w-lg mb-12 leading-relaxed pl-6 border-l-4 border-red-600 bg-red-50/50 py-2">
            The Iraqi Domino Association is the sole governing authority for competitive play. We enforce historical regulations, sanction global tournaments, and advance the sport through deterministic mathematical analysis.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <Link href="/arena" className="group relative bg-[#0a0a0a] text-white font-bold uppercase tracking-[0.2em] px-10 py-5 overflow-hidden shadow-[8px_8px_0px_rgba(220,38,38,1)] hover:shadow-[0px_0px_0px_rgba(220,38,38,1)] hover:translate-x-2 hover:translate-y-2 transition-all duration-300">
              <div className="absolute inset-0 w-full h-full bg-red-600 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] z-0"></div>
              <span className="relative z-10 transition-colors duration-500">Enter Sanctioned Play</span>
            </Link>
            <Link href="/leaderboard" className="group flex items-center gap-4 px-6 py-5 text-black/60 font-mono text-xs font-bold uppercase tracking-widest hover:text-black transition-colors">
              <span className="w-2 h-2 bg-black/20 rounded-full group-hover:bg-red-600 group-hover:scale-150 transition-all"></span>
              View Official Registry
            </Link>
          </div>
        </div>

        {/* RIGHT: 3D Engine Showcase */}
        <div className="flex-1 flex items-center justify-center relative p-8 lg:p-0 overflow-visible">
          <LightDomino />
          
          {/* Light Mode Floating Cards */}
          <div className="absolute top-1/4 right-[5%] bg-white/90 backdrop-blur-md border border-black/10 p-6 font-mono text-xs hidden lg:block shadow-[10px_10px_0px_rgba(0,0,0,0.05)] transform rotate-3 hover:rotate-0 transition-transform duration-500">
            <div className="flex items-center gap-2 border-b border-black/10 pb-3 mb-3">
              <div className="w-2 h-2 bg-red-600 animate-pulse"></div>
              <span className="text-black/50 tracking-widest font-bold">ENGINE TELEMETRY</span>
            </div>
            <p className="text-4xl font-black text-[#0a0a0a] mb-1">+4.23</p>
            <p className="text-black/40 font-bold">IS-MCTS Depth: 10,000</p>
          </div>

          <div className="absolute bottom-1/4 left-[5%] bg-white/90 backdrop-blur-md border border-black/10 p-6 font-mono text-xs hidden lg:block shadow-[10px_10px_0px_rgba(0,0,0,0.05)] transform -rotate-2 hover:rotate-0 transition-transform duration-500">
            <div className="flex items-center gap-2 border-b border-black/10 pb-3 mb-3">
              <div className="w-2 h-2 bg-green-500"></div>
              <span className="text-black/50 tracking-widest font-bold">FEDERATION RULE</span>
            </div>
            <p className="text-2xl font-black text-[#0a0a0a] mb-1">Victor's Privilege</p>
            <p className="text-black/40 font-bold">Strategic Opening Authorized</p>
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-block;
          white-space: nowrap;
          animation: marquee 30s linear infinite;
        }
        .preserve-3d { transform-style: preserve-3d; }
        .perspective-1000 { perspective: 1000px; }
      `}} />
    </div>
  );
}
