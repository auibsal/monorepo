'use client'; // Required for the interactive hover dominoes

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden bg-federation-obsidian">
      
      {/* Background visual noise / grid */}
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 mix-blend-overlay pointer-events-none"></div>
      
      {/* The Visual representation of a "Blank/Blank" locked tile */}
      <div className="relative z-10 flex flex-col items-center group cursor-not-allowed mb-12">
        <div className="w-24 h-48 border-4 border-federation-ivory rounded-xl flex flex-col bg-federation-obsidian group-hover:bg-red-950 transition-colors duration-500 shadow-[0_0_50px_rgba(249,246,238,0.1)] group-hover:shadow-[0_0_50px_rgba(220,38,38,0.3)]">
          <div className="flex-1 border-b-4 border-federation-ivory flex justify-center items-center">
            {/* Blank */}
          </div>
          <div className="flex-1 flex justify-center items-center">
            {/* Blank */}
          </div>
        </div>
        
        {/* Floating text behind the tile */}
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[150px] font-black text-white/5 -z-10 group-hover:text-red-500/10 transition-colors duration-500">
          404
        </span>
      </div>

      <div className="text-center z-10">
        <h2 className="text-xl font-medium tracking-wide mb-2 opacity-80 text-red-500" style={{ fontFamily: 'var(--font-ibm-plex-arabic)' }}>
          اللوحة مقفلة
        </h2>
        <h1 className="text-5xl md:text-7xl font-bold uppercase tracking-tighter mb-6">
          The Board is Locked
        </h1>
        <p className="text-lg md:text-xl font-light opacity-70 mb-10 max-w-lg mx-auto">
          Neither end of the chain can be matched. The page you are looking for does not exist in the Federation database.
        </p>

        <Link 
          href="/" 
          className="inline-flex items-center gap-3 px-8 py-4 bg-federation-ivory text-federation-obsidian font-bold uppercase tracking-wider rounded-sm hover:scale-105 active:scale-95 transition-transform"
        >
          <span>Shuffle & Re-draw</span>
          <span>&rarr;</span>
        </Link>
      </div>

    </div>
  );
}
