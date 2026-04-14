'use client';

import { useState } from 'react';
import { queryOracle } from '@/utils/engine/oracle';
import { parseDPN } from '@/utils/engine/dpnParser';

export const DpnTester = () => {
  const [dpnInput, setDpnInput] = useState<string>("1. [6|6] P1 2. [6|5] P2 3. [5|2] P3 4. PASS P4");
  const [result, setResult] = useState<any>(null);
  const [isComputing, setIsComputing] = useState(false);

  const analyzeNotation = async () => {
    setIsComputing(true);
    
    // 1. Run the human text through the TypeScript Parser
    const parsedInformationSet = parseDPN(dpnInput, 1);

    // Hardcode your test hand so the engine has valid moves to evaluate
    parsedInformationSet.my_hand = [
      { high: 6, low: 2 }, 
      { high: 6, low: 1 }, 
      { high: 3, low: 3 },
      { high: 6, low: 3 }, 
      { high: 6, low: 4 }
    ];

    // 2. Fire the translated JSON across the WASM bridge to Rust
    const engineOutput = await queryOracle(JSON.stringify(parsedInformationSet));
    
    setResult(engineOutput);
    setIsComputing(false);
  };

  return (
    <div className="p-8 bg-black border border-white/20 rounded-xl font-mono text-sm max-w-2xl mx-auto mt-12">
      <h2 className="text-red-500 font-bold uppercase tracking-widest mb-4 border-b border-white/10 pb-2">
        IDA Engine Terminal
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
          className="bg-white text-black font-bold uppercase tracking-widest px-6 py-3 hover:bg-gray-200 transition-colors w-full disabled:opacity-50"
        >
          {isComputing ? 'Calculating Universes...' : 'Analyze DPN Notation'}
        </button>

        {result && !result.error && (
          <div className="bg-white/5 p-4 border border-white/10 space-y-2 text-white/90">
            <p className="text-green-400">✓ Engine Execution Complete</p>
            <p><strong>Universes Analyzed:</strong> {result.depth.toLocaleString()}</p>
            <p><strong>Win Probability:</strong> {(result.win_probability * 100).toFixed(1)}%</p>
            <p className="flex items-center gap-2">
              <strong>Oracle's Best Move:</strong> 
              <span className="bg-white/10 px-2 py-1 rounded">[{result.best_move[0]} | {result.best_move[1]}]</span>
            </p>
            {/* THIS IS THE NEW TARGET RENDERER */}
            {result.target_pip !== null && result.target_pip !== undefined ? (
               <p className="text-red-400"><strong>Target End:</strong> Connect to the <strong>{result.target_pip}</strong></p>
            ) : (
               <p className="text-white/50"><strong>Target End:</strong> Any (Opening Move)</p>
            )}
          </div>
        )}

        {result && result.error && (
          <div className="bg-red-900/20 text-red-400 p-4 border border-red-500/20">
            <p><strong>Engine Error:</strong> {result.error}</p>
          </div>
        )}
      </div>
    </div>
  );
};
