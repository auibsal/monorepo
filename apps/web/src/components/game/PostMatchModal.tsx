'use client';

import { useGameStore } from '@/store/useGameStore';

export const PostMatchModal = () => {
  const { gameStatus, matchResult } = useGameStore();

  if (gameStatus !== 'finished' || !matchResult) return null;

  const handleAnalyze = () => {
    // 1. Bundle the DPN log
    // 2. Transmit to Supabase (transmitMatchLog)
    // 3. Boot up the Rust WASM Engine to process the match
    console.log("Booting IDA Oracle Engine...");
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-federation-obsidian border border-federation-ivory/20 p-12 rounded-lg shadow-2xl text-center max-w-lg w-full">
        <h2 className="text-4xl font-bold uppercase tracking-widest text-federation-ivory mb-2">
          {matchResult.reason}
        </h2>
        <p className="text-xl text-federation-ivory/70 mb-8">
          Winner: <span className="text-red-500 font-bold">{matchResult.winner}</span>
        </p>

        <div className="space-y-4">
          <button 
            onClick={handleAnalyze}
            className="w-full py-4 bg-federation-ivory text-federation-obsidian font-bold uppercase tracking-widest hover:bg-white transition-colors flex items-center justify-center gap-3"
          >
            <span>🧠</span> Run Engine Analysis
          </button>
          
          <button className="w-full py-4 border border-federation-ivory/20 text-federation-ivory font-bold uppercase tracking-widest hover:bg-federation-ivory/10 transition-colors">
            Return to Lobby
          </button>
        </div>
      </div>
    </div>
  );
};
