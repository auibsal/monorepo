'use client';

import { useState, useEffect } from 'react';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

// --- AWWWARDS-STYLE INTERACTIVE DOMINO ---
const FederationDomino = () => {
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
        <div className="absolute inset-0 bg-[#f4f4f4] rounded-sm shadow-[0_30px_60px_rgba(0,0,0,0.8)] border-[12px] border-[#e0e0e0] flex flex-col justify-between p-10 overflow-hidden">
          {/* Top Half: 6 */}
          <div className="grid grid-cols-2 grid-rows-3 gap-6 h-[40%]">
            <div className="bg-[#0a0a0a] rounded-full w-10 h-10 place-self-center shadow-inner"></div>
            <div className="bg-[#0a0a0a] rounded-full w-10 h-10 place-self-center shadow-inner"></div>
            <div className="bg-[#0a0a0a] rounded-full w-10 h-10 place-self-center shadow-inner"></div>
            <div className="bg-[#0a0a0a] rounded-full w-10 h-10 place-self-center shadow-inner"></div>
            <div className="bg-[#0a0a0a] rounded-full w-10 h-10 place-self-center shadow-inner"></div>
            <div className="bg-[#0a0a0a] rounded-full w-10 h-10 place-self-center shadow-inner"></div>
          </div>
          
          {/* The Brass Spinner */}
          <div className="h-3 w-full bg-[#111] flex items-center justify-center my-6 relative shadow-[0_5px_15px_rgba(0,0,0,0.2)]">
            <div className="absolute w-8 h-8 bg-gradient-to-br from-yellow-500 to-yellow-800 rounded-full border-4 border-[#e0e0e0] shadow-lg"></div>
          </div>

          {/* Bottom Half: 2 */}
          <div className="grid grid-cols-2 grid-rows-3 gap-6 h-[40%] relative">
            <div className="bg-[#0a0a0a] rounded-full w-10 h-10 place-self-end col-start-2 row-start-1 shadow-inner"></div>
            <div className="bg-[#0a0a0a] rounded-full w-10 h-10 place-self-start col-start-1 row-start-3 shadow-inner"></div>
          </div>
        </div>
        {/* Extreme Depth Shadow */}
        <div className="absolute inset-0 bg-red-600/20 rounded-sm transform translate-y-8 translate-x-8 -z-10 blur-2xl group-hover:bg-red-600/40 transition-colors duration-500"></div>
      </div>
    </div>
  );
};

export default function AssociationHomePage() {
  const [mounted, setMounted] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const t = useTranslations('Home');

  useEffect(() => {
    setMounted(true);
    const handleGlobalMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-red-600 selection:text-white font-sans overflow-hidden relative">
      
      {/* Awwwards Spotlight Effect */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle 600px at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.03), transparent 80%)`
        }}
      />

      {/* FEDERATION TICKER */}
      <div className="bg-red-600 text-black font-mono text-xs font-bold uppercase tracking-[0.2em] whitespace-nowrap overflow-hidden border-b border-red-800 py-2 relative z-10">
        <div className="animate-marquee inline-block">
          <span className="mx-6">● {t('ticker1')}</span>
          <span className="mx-6">|</span>
          <span className="mx-6 text-white">{t('ticker2')}</span>
          <span className="mx-6">|</span>
          <span className="mx-6">{t('ticker3')}</span>
          <span className="mx-6">|</span>
          <span className="mx-6 text-white">{t('ticker4')}</span>
          <span className="mx-6">|</span>
        </div>
      </div>

      {/* HERO SECTION */}
      <main className="relative z-10 flex flex-col lg:flex-row min-h-[90vh]">
        {/* Background Grids */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay z-0"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none z-0"></div>

        {/* LEFT: Typography & Authority */}
        <div className="flex-1 flex flex-col justify-center p-8 md:p-16 lg:p-24 relative z-10 border-r border-white/5">
          <div className="flex items-center gap-4 mb-8">
            <span className="w-8 h-[1px] bg-red-500"></span>
            <span className="text-red-500 font-mono text-xs uppercase tracking-[0.4em]">{t('governingBody')}</span>
          </div>

          {/* Massive Outline Typography */}
          <h2 className="text-6xl md:text-8xl lg:text-[7rem] font-black uppercase leading-[0.85] tracking-tighter mb-8 relative">
            <span className="text-transparent [-webkit-text-stroke:2px_rgba(255,255,255,0.2)] block hover:[-webkit-text-stroke:2px_white] transition-colors duration-500">{t('preserve')}</span>
            <span className="text-white block">{t('theHeritage')}</span>
            <span className="text-transparent [-webkit-text-stroke:2px_rgba(255,255,255,0.2)] block hover:[-webkit-text-stroke:2px_white] transition-colors duration-500">{t('master')}</span>
            <span className="text-white block">{t('theBoard')}</span>
          </h2>

          <p className="text-gray-400 font-mono text-sm md:text-base max-w-lg mb-12 leading-relaxed pl-6 border-l-2 border-white/10">
            {t('description')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <Link href="/arena" className="group relative bg-white text-black font-bold uppercase tracking-[0.2em] px-10 py-5 overflow-hidden">
              <div className="absolute inset-0 w-full h-full bg-red-600 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] z-0"></div>
              <span className="relative z-10 group-hover:text-white transition-colors duration-500">{t('enterPlay')}</span>
            </Link>
            <Link href="/leaderboard" className="group flex items-center gap-4 px-6 py-5 text-white/60 font-mono text-xs uppercase tracking-widest hover:text-white transition-colors">
              <span className="w-2 h-2 bg-white/20 rounded-full group-hover:bg-red-500 transition-colors"></span>
              {t('viewRegistry')}
            </Link>
          </div>
        </div>

        {/* RIGHT: 3D Engine Showcase */}
        <div className="flex-1 flex items-center justify-center relative p-8 lg:p-0 overflow-hidden">
          <FederationDomino />
          
          {/* Association UI Overlays */}
          <div className="absolute top-1/4 right-[10%] bg-black/60 backdrop-blur-md border border-white/10 p-5 font-mono text-xs hidden lg:block shadow-2xl transform rotate-3 hover:rotate-0 transition-transform">
            <div className="flex items-center gap-2 border-b border-white/10 pb-2 mb-2">
              <div className="w-2 h-2 bg-red-500 animate-pulse"></div>
              <span className="text-white/60 tracking-widest">{t('engineTelemetry')}</span>
            </div>
            <p className="text-3xl font-light text-white mb-1">+4.23</p>
            <p className="text-white/40">{t('depth')}: 10,000</p>
          </div>

          <div className="absolute bottom-1/4 left-[10%] bg-black/60 backdrop-blur-md border border-white/10 p-5 font-mono text-xs hidden lg:block shadow-2xl transform -rotate-2 hover:rotate-0 transition-transform">
            <div className="flex items-center gap-2 border-b border-white/10 pb-2 mb-2">
              <div className="w-2 h-2 bg-green-500"></div>
              <span className="text-white/60 tracking-widest">{t('federationRule')}</span>
            </div>
            <p className="text-xl font-light text-white mb-1">{t('victorPrivilege')}</p>
            <p className="text-white/40">{t('strategicOpening')}</p>
          </div>
        </div>
      </main>

      {/* Required style for the marquee and stroke */}
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
