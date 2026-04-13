'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { GameTable } from '@/components/game/GameTable';
import { OracleBar } from '@/components/game/OracleBar';
import { PostMatchModal } from '@/components/game/PostMatchModal';

export default function PlayArenaPage() {
  const { startGame, currentTurn, passTurn } = useGameStore();

  // Mock Initialization: Deal 7 tiles to all 4 players
  useEffect(() => {
    // In production, this data comes securely from the Supabase multiplayer server
    startGame({
      1: [{ id: '6-6', high: 6, low: 6 }, { id: '6-4', high: 6, low: 4 }, /* 5 more */],
      2: [{ id: '5-5', high: 5, low: 5 }, /* 6 more */],
      3: [{ id: '3-3', high: 3, low: 3 }, /* 6 more */],
      4: [{ id: '1-1', high: 1, low: 1 }, /* 6 more */],
    });
  }, []);

  return (
    <div className="w-full min-h-screen bg-[#0a0a0a] flex overflow-hidden">
      
      {/* LEFT PANEL: The Oracle Engine (Always watching) */}
      <aside className="w-24 border-r border-federation-ivory/10 bg-black flex flex-col items-center py-8">
        <OracleBar />
      </aside>

      {/* CENTER PANEL: The 2v2 Table */}
      <main className="flex-1 relative flex flex-col items-center justify-center p-8">
        
        {/* Opponent Top (Player 3 - Partner) */}
        <div className="absolute top-8 flex gap-1 opacity-50">
           {[...Array(7)].map((_, i) => <div key={i} className="w-8 h-12 bg-federation-ivory/20 rounded-sm" />)}
        </div>

        {/* Opponent Left (Player 2) */}
        <div className="absolute left-8 flex flex-col gap-1 opacity-50">
           {[...Array(7)].map((_, i) => <div key={i} className="w-12 h-8 bg-federation-ivory/20 rounded-sm" />)}
        </div>

        {/* Opponent Right (Player 4) */}
        <div className="absolute right-8 flex flex-col gap-1 opacity-50">
           {[...Array(7)].map((_, i) => <div key={i} className="w-12 h-8 bg-federation-ivory/20 rounded-sm" />)}
        </div>

        {/* The Core Table (Built in previous step) */}
        <div className="w-full max-w-4xl mt-12">
           <GameTable />
        </div>

        {/* Action Bar (Pass Button) */}
        <div className="absolute bottom-32 flex justify-center w-full">
           <button 
             onClick={() => passTurn(1)}
             disabled={currentTurn !== 1}
             className="px-8 py-3 border border-red-500 text-red-500 font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed"
           >
             Knock / Pass
           </button>
        </div>

        {/* Game Over Modal */}
        <PostMatchModal />

      </main>

      {/* RIGHT PANEL: Match Log & ELO Stats */}
      <aside className="w-64 border-l border-federation-ivory/10 bg-black p-6 flex flex-col">
        <h3 className="text-xs font-bold uppercase tracking-widest text-federation-ivory/50 mb-6 border-b border-federation-ivory/10 pb-4">
          Live Match Log
        </h3>
        
        <div className="flex-1 overflow-y-auto text-sm font-mono space-y-3 opacity-80">
          <p><span className="text-federation-ivory/40">1.</span> P1 plays 6-6</p>
          <p><span className="text-federation-ivory/40">2.</span> P2 plays 6-4 on End A</p>
          <p><span className="text-federation-ivory/40">3.</span> P3 passes</p>
          {/* This will eventually map over a log array in the Zustand store */}
        </div>
      </aside>

    </div>
  );
}
