'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { useMatchSync } from '@/hooks/useMatchSync';
import { GameTable } from '@/components/game/GameTable';
import { OracleBar } from '@/components/game/OracleBar';
import { PostMatchModal } from '@/components/game/PostMatchModal';

export default function PlayArenaPage() {
  // In a real app, these come from the URL params or a Matchmaking Lobby
  const matchId = "live-championship-001";
  const myPlayerNumber = 1; // 1, 2, 3, or 4

  const store = useGameStore();
  const { broadcastPlay, broadcastPass } = useMatchSync(matchId, myPlayerNumber);

  // Intercept the default Zustand "playTile" to add broadcasting
  const handleTileDrop = (tileId: string, end: 'left' | 'right') => {
    // 1. Play the tile locally
    store.playTile(myPlayerNumber, tileId, end);
    
    // 2. Fetch the newly updated state
    const newState = useGameStore.getState();
    
    // 3. Broadcast it to Erbil, Basra, and beyond via Supabase
    broadcastPlay({
      hands: newState.hands,
      boardTiles: newState.boardTiles,
      openEnds: newState.openEnds,
      currentTurn: newState.currentTurn,
      gameStatus: newState.gameStatus,
    });
  };

  const handlePass = () => {
    store.passTurn(myPlayerNumber);
    const newState = useGameStore.getState();
    broadcastPass({
      currentTurn: newState.currentTurn,
      consecutivePasses: newState.consecutivePasses,
      gameStatus: newState.gameStatus,
    });
  };

  return (
    <div className="w-full min-h-screen bg-[#0a0a0a] flex overflow-hidden">
      {/* LEFT PANEL: The Oracle Engine */}
      <aside className="w-24 border-r border-federation-ivory/10 bg-black flex flex-col items-center py-8">
        <OracleBar />
      </aside>

      {/* CENTER PANEL: The 2v2 Table */}
      <main className="flex-1 relative flex flex-col items-center justify-center p-8">
        
        {/* Opponent UI Overlays (Masking their tiles) */}
        <div className="absolute top-8 flex gap-1 opacity-50">
           {[...Array(store.hands[3]?.length || 0)].map((_, i) => <div key={i} className="w-8 h-12 bg-federation-ivory/20 rounded-sm" />)}
        </div>

        {/* ... (Left and Right opponent masks omitted for brevity) ... */}

        <div className="w-full max-w-4xl mt-12">
           {/* Pass the intercepted handler to the GameTable */}
           <GameTable onTilePlayed={handleTileDrop} /> 
        </div>

        {/* Action Bar (Pass Button) */}
        <div className="absolute bottom-32 flex justify-center w-full">
           <button 
             onClick={handlePass}
             disabled={store.currentTurn !== myPlayerNumber}
             className="px-8 py-3 border border-red-500 text-red-500 font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed"
           >
             Knock / Pass
           </button>
        </div>

        <PostMatchModal />
      </main>

      {/* RIGHT PANEL: Match Log */}
      <aside className="w-64 border-l border-federation-ivory/10 bg-black p-6 flex flex-col">
        <h3 className="text-xs font-bold uppercase tracking-widest text-federation-ivory/50 mb-6 border-b border-federation-ivory/10 pb-4">
          Match Protocol
        </h3>
        {/* Render move log here */}
      </aside>
    </div>
  );
}
