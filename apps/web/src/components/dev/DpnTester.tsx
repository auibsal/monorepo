'use client';

import { useState } from 'react';
import { queryOracle } from '@/utils/engine/oracle';

export const DpnTester = () => {
  // A sample of your proprietary DPN format
  const [dpnInput, setDpnInput] = useState<string>("1. [6|6] P1 2. [6|5] P2 3. [5|2] P3 4. PASS P4");
  const [result, setResult] = useState<any>(null);
  const [isComputing, setIsComputing] = useState(false);

  const analyzeNotation = async () => {
    setIsComputing(true);
    
    // 1. In a production app, we would write a regex parser here to convert
    // the DPN string into the strict 'boardStateJson' format. 
    // For this test, we will mock the parsed Information Set that the DPN represents.
    const parsedInformationSet = {
      current_turn: 1,
      consecutive_passes: 1,
      open_ends: [6, 2], // The 6-6 and 5-2 are on the edges
      my_hand: [{ high: 6, low: 3 }, { high: 2, low: 1 }, { high: 4, low: 4 }],
      board_tiles: [{ high: 6, low: 6 }, { high: 6, low: 5 }, { high: 5, low: 2 }],
      opponent_counts: { 2: 6, 3: 6, 4: 7 }
    };

    // 2. Fire it across the WASM bridge
    const engineOutput = await queryOracle(JSON.stringify(parsedInformationSet));
    
    setResult(engineOutput);
    setIsComputing(false);
  };

  return (
    <div className="p-8 bg-black border border-white/20 rounded-xl font-mono text-sm max-w-2xl mx-auto mt-12">
      <h2 className="text-red-500 font-bold uppercase tracking-widest mb-4 border-b border-white/10 pb-2">
        DPN Engine Terminal
      </h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-white/50 mb-2 text-xs">Enter DPN String:</label>
          <textarea 
            className="w-full bg-white/5 border border-white/10 p-4 text-white h-24 focus:border-red-500 outline-none transition-colors"
            value={dpnInput}
            onChange={(e) => setDpnInput(e.target.value)}
          />
        </div>

        <button 
          onClick={analyzeNotation}
          disabled={isComputing}
          className="bg-white text-black font-bold uppercase tracking-widest px-6 py-3 hover:bg-gray-200 transition-colors w-full"
        >
          {isComputing ? 'Calculating Universes...' : 'Analyze DPN Notation'}
        </button>

        {result && (
          <div className="bg-white/5 p-4 border border-white/10 space-y-2 text-white/90">
            <p className="text-green-400">✓ Engine Execution Complete</p>
            <p><strong>Universes Analyzed:</strong> {result.depth.toLocaleString()}</p>
            <p><strong>Win Probability:</strong> {(result.win_probability * 100).toFixed(1)}%</p>
            <p><strong>Oracle's Best Move:</strong> [{result.best_move[0]} | {result.best_move[1]}]</p>
          </div>
        )}
      </div>
    </div>
  );
};
