'use client';

import { useGameStore } from '@/store/useGameStore';

export const OracleBar = () => {
  const { winProbability = 0.5, analysisDepth = 0 } = useGameStore();
  
  // Convert 0-1 probability to percentage height
  const height = `${winProbability * 100}%`;

  return (
    <div className="flex flex-col items-center gap-4 h-full py-8">
      <div className="relative w-4 h-[400px] bg-federation-obsidian border border-federation-ivory/20 rounded-full overflow-hidden">
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
      
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-tighter opacity-60">Oracle Prob</p>
        <p className="text-xl font-mono font-bold">{(winProbability * 100).toFixed(1)}%</p>
        <p className="text-[10px] font-mono opacity-40 mt-1">Depth: {analysisDepth.toLocaleString()}</p>
      </div>
    </div>
  );
};
