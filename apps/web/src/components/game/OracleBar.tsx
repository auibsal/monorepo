'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { queryOracle } from '@/utils/engine/oracle';

export const OracleBar = () => {
  // 1. Pull the "God View" (GameState) from the store
  const { 
    winProbability = 0.5, 
    analysisDepth = 0,
    updateAnalysis,
    hands,
    boardTiles,
    openEnds,
    currentTurn,
    consecutivePasses
  } = useGameStore();
  
  const [isCalculating, setIsCalculating] = useState(false);

  // Convert 0-1 probability to percentage height
  const height = `${winProbability * 100}%`;

  const handleTestEngine = async () => {
    if (isCalculating) return;
    setIsCalculating(true);

    // 2. STRIP THE GOD VIEW: Build the Information Set (BoardState)
    // We only send the engine what the current player can physically see.
    const myPlayerId = 1; // Assuming we are Player 1 in the local UI

    const informationSet = {
      current_turn: currentTurn,
      consecutive_passes: consecutivePasses,
      open_ends: openEnds,
      my_hand: hands[myPlayerId] || [],
      board_tiles: boardTiles,
      // We send opponent tile COUNTS for tracking, but explicitly hide their actual dominoes
      opponent_counts: {
        2: hands[2]?.length || 0,
        3: hands[3]?.length || 0,
        4: hands[4]?.length || 0,
      }
    };

    // 3. Fire the blind data into the Rust Engine
    const result = await queryOracle(JSON.stringify(informationSet));
    
    if (result) {
      // 4. Update the UI with the Engine's mathematical verdict
      updateAnalysis(result.win_probability, result.best_move, result.depth);
    }
    
    setIsCalculating(false);
  };

  return (
    <div 
      className="flex flex-col items-center gap-4 h-full py-8 cursor-pointer group"
      onClick={handleTestEngine}
      title="Click to run IDA Oracle Engine"
    >
      <div className={`relative w-4 h-[400px] bg-federation-obsidian border border-federation-ivory/20 rounded-full overflow-hidden transition-all ${isCalculating ? 'shadow-[0_0_15px_rgba(239,68,68,0.5)]' : ''}`}>
        
        {/* Opponent Probability (Top/Dark) */}
        <div className="absolute inset-0 bg-gray-800" />
        
        {/* Your Probability (Bottom/Light) */}
        <div 
          className="absolute bottom-0 w-full bg-gradient-to-t from-red-600 to-federation-ivory transition-all duration-1000 ease-in-out"
          style={{ height }}
        />
        
        {/* 50% Marker */}
        <div className="absolute top-1/2 w-full h-[1px] bg-white/20" />
      </div>
      
      <div className="text-center group-hover:text-red-400 transition-colors">
        <p className="text-xs font-bold uppercase tracking-tighter opacity-60">
          {isCalculating ? 'CALCULATING...' : 'ORACLE PROB'}
        </p>
        <p className="text-xl font-mono font-bold">{(winProbability * 100).toFixed(1)}%</p>
        <p className="text-[10px] font-mono opacity-40 mt-1">Depth: {analysisDepth.toLocaleString()}</p>
      </div>
    </div>
  );
};
