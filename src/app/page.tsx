'use client'; // Needed for interactive elements

import Link from 'next/link';
import { useState } from 'react';

export default function InteractiveHome() {
  // Mock interactive state for a "Live Match" viewer
  const [hoveredTile, setHoveredTile] = useState<number | null>(null);

  return (
    <div className="w-full">
      
      {/* HERO SECTION */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-6 overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-federation-ivory/5 via-federation-obsidian to-federation-obsidian -z-10"></div>
        
        <div className="text-center max-w-4xl z-10 relative">
          <div className="inline-block mb-6 px-4 py-1.5 border border-federation-ivory/20 rounded-full bg-federation-ivory/5 backdrop-blur-sm animate-pulse">
            <span className="text-xs uppercase tracking-widest font-semibold text-red-500 mr-2">● LIVE</span>
            <span className="text-xs uppercase tracking-widest opacity-80">Season 1 Ladder is Active</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-medium tracking-wide mb-4 opacity-90" style={{ fontFamily: 'var(--font-ibm-plex-arabic)' }}>
            الاتحاد العراقي للدومينو
          </h2>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8 uppercase leading-[1.1]">
            Standardizing The <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-federation-ivory to-gray-600">
              National Sport
            </span>
          </h1>

          <p className="text-lg md:text-xl font-light opacity-70 mb-12 max-w-2xl mx-auto leading-relaxed">
            Register your Federation ID, compete in officially sanctioned tournaments across Iraq, and climb the mathematically verified national ELO leaderboard.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link href="/register" className="group relative px-8 py-4 bg-federation-ivory text-federation-obsidian font-bold uppercase tracking-wider overflow-hidden rounded-sm">
              <span className="relative z-10">Claim Player ID</span>
              <div className="absolute inset-0 h-full w-0 bg-gray-300 transition-all duration-300 ease-out group-hover:w-full z-0"></div>
            </Link>
            <Link href="/rules" className="px-8 py-4 border border-federation-ivory/30 text-federation-ivory font-bold uppercase tracking-wider rounded-sm hover:bg-federation-ivory/10 transition-colors">
              Read the Rulebook
            </Link>
          </div>
        </div>

        {/* Floating Interactive Dominoes (Pure CSS Animation) */}
        <div className="absolute bottom-10 left-10 opacity-20 hover:opacity-100 transition-opacity transform -rotate-12 cursor-pointer hidden md:block group">
          <div className="w-16 h-32 border-2 border-federation-ivory rounded-md flex flex-col group-hover:-translate-y-4 transition-transform duration-500 bg-federation-obsidian">
            <div className="flex-1 flex justify-center items-center text-3xl font-bold border-b-2 border-federation-ivory">6</div>
            <div className="flex-1 flex justify-center items-center text-3xl font-bold">6</div>
          </div>
        </div>
      </section>

      {/* LIVE LEADERBOARD PREVIEW (Interactive) */}
      <section className="py-24 border-y border-federation-ivory/10 bg-black/20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold uppercase tracking-wider mb-2">National Top 5</h2>
              <p className="text-sm uppercase tracking-widest text-federation-ivory/50">Mathematical ELO Ratings</p>
            </div>
            <Link href="/leaderboard" className="text-sm font-bold uppercase tracking-widest border-b border-federation-ivory hover:text-gray-400 transition-colors pb-1">
              View Full Ladder
            </Link>
          </div>

          <div className="flex flex-col gap-4">
            {[
              { rank: 1, name: "Ali Hassan", id: "IDF-001042", elo: "2145.50", status: "up" },
              { rank: 2, name: "Omar Al-Fadhli", id: "IDF-008211", elo: "2102.10", status: "down" },
              { rank: 3, name: "Mustafa Kamal", id: "IDF-019920", elo: "2088.00", status: "stable" },
            ].map((player, idx) => (
              <div 
                key={player.id}
                onMouseEnter={() => setHoveredTile(idx)}
                onMouseLeave={() => setHoveredTile(null)}
                className={`flex items-center justify-between p-6 border transition-all duration-300 cursor-pointer rounded-sm ${hoveredTile === idx ? 'bg-federation-ivory text-federation-obsidian border-federation-ivory scale-[1.02]' : 'bg-transparent border-federation-ivory/20 text-federation-ivory'}`}
              >
                <div className="flex items-center gap-8">
                  <span className="text-2xl font-black opacity-50">0{player.rank}</span>
                  <div>
                    <h3 className="font-bold text-lg">{player.name}</h3>
                    <p className={`text-xs font-mono tracking-widest ${hoveredTile === idx ? 'text-federation-obsidian/70' : 'text-federation-ivory/50'}`}>{player.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-mono font-bold">{player.elo}</p>
                  <p className={`text-xs uppercase tracking-widest ${player.status === 'up' ? 'text-green-500' : player.status === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
                    {player.status === 'up' ? '▲ Rating Up' : player.status === 'down' ? '▼ Rating Down' : '− Stable'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE ECOSYSTEM GRID */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <Link href="/affiliates" className="group p-10 bg-federation-ivory/5 border border-federation-ivory/10 hover:bg-federation-ivory/10 transition-colors rounded-sm">
            <h3 className="text-2xl font-bold uppercase mb-4 group-hover:text-red-500 transition-colors">Sanctioned Venues</h3>
            <p className="font-light opacity-70 mb-8 leading-relaxed">Turn your cafe or club into an official IDF affiliate. Host ranked tournaments and draw massive foot traffic.</p>
            <span className="text-sm font-bold uppercase tracking-widest border-b border-federation-ivory/30 pb-1 group-hover:border-federation-ivory transition-colors">Apply as Host &rarr;</span>
          </Link>

          <Link href="/arbiters" className="group p-10 bg-federation-ivory/5 border border-federation-ivory/10 hover:bg-federation-ivory/10 transition-colors rounded-sm">
            <h3 className="text-2xl font-bold uppercase mb-4 group-hover:text-red-500 transition-colors">Arbiter Certification</h3>
            <p className="font-light opacity-70 mb-8 leading-relaxed">Uphold the integrity of the game. Take the exam to become a certified referee with authorization to input live match data.</p>
            <span className="text-sm font-bold uppercase tracking-widest border-b border-federation-ivory/30 pb-1 group-hover:border-federation-ivory transition-colors">Take the Exam &rarr;</span>
          </Link>

          <Link href="/collegiate" className="group p-10 bg-federation-ivory/5 border border-federation-ivory/10 hover:bg-federation-ivory/10 transition-colors rounded-sm">
            <h3 className="text-2xl font-bold uppercase mb-4 group-hover:text-red-500 transition-colors">Collegiate League</h3>
            <p className="font-light opacity-70 mb-8 leading-relaxed">Establish a Federation Chapter at your university. Defend your institution's pride in the national academic bracket.</p>
            <span className="text-sm font-bold uppercase tracking-widest border-b border-federation-ivory/30 pb-1 group-hover:border-federation-ivory transition-colors">Start a Chapter &rarr;</span>
          </Link>
        </div>
      </section>

    </div>
  );
}
