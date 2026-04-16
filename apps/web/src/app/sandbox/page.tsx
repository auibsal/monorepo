'use client';

import { useState, useMemo } from 'react';
import { DominoEngine2v2, Domino } from '@repo/core';
import DominoTile from '../../components/DominoTile';
import { calculateLinearBoard } from '../../utils/boardLayout';

export default function OfflineSandbox() {
    // 1. Initialize the engine inside the component state
    // We use useMemo so the board doesn't re-shuffle every time the component renders
    const engine = useMemo(() => new DominoEngine2v2(), []);
    
    // 2. Local state to force React to update when the engine state changes
    const [turn, setTurn] = useState(engine.currentTurn);
    const [board, setBoard] = useState<Domino[]>([]);
    const [hands, setHands] = useState(engine.hands);

    const handlePlay = (tile: Domino, side: 'left' | 'right') => {
        const success = engine.playDomino(engine.currentTurn, tile, side);
        
        if (success) {
            // Update local state to trigger a re-render
            setBoard([...engine.board]);
            setTurn(engine.currentTurn);
            setHands({...engine.hands});
        } else {
            alert("Invalid Move!");
        }
    };

    const visualBoard = calculateLinearBoard(board);

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-mono p-8">
            <header className="mb-8 border-b border-zinc-800 pb-4">
                <h1 className="text-2xl font-bold tracking-tighter">OFFLINE_TEST_ENVIRONMENT</h1>
                <p className="text-zinc-500 text-sm">Playing as: TEAM {turn === 0 || turn === 2 ? 'A' : 'B'} (Player {turn})</p>
            </header>

            {/* THE BOARD */}
            <div className="flex items-center justify-center min-h-[300px] bg-zinc-900/50 rounded-lg border border-zinc-800 mb-12 overflow-x-auto p-10">
                <div className="flex items-center gap-1">
                    {visualBoard.length === 0 ? (
                        <span className="text-zinc-700 italic">Board is empty. Play the [6,6] to start.</span>
                    ) : (
                        visualBoard.map((tile, idx) => (
                            <DominoTile 
                                key={idx} 
                                values={tile.values} 
                                orientation="horizontal" 
                                isReversed={tile.isReversed} 
                            />
                        ))
                    )}
                </div>
            </div>

            {/* THE HAND (Changes based on whose turn it is) */}
            <div className="flex flex-col items-center gap-6">
                <h2 className="text-xs uppercase tracking-[0.3em] text-zinc-500">Active Hand: Player {turn}</h2>
                <div className="flex gap-4 p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
                    {hands[turn].map((tile, idx) => (
                        <div key={idx} className="group relative">
                            <DominoTile values={tile} orientation="vertical" isReversed={false} />
                            
                            {/* Controls appear on hover */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity rounded">
                                <button 
                                    onClick={() => handlePlay(tile, 'left')}
                                    className="bg-white text-black text-[10px] font-bold px-2 py-1 w-16"
                                >
                                    PLAY LEFT
                                </button>
                                <button 
                                    onClick={() => handlePlay(tile, 'right')}
                                    className="bg-white text-black text-[10px] font-bold px-2 py-1 w-16"
                                >
                                    PLAY RIGHT
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                
                <button 
                    onClick={() => { engine.passTurn(turn); setTurn(engine.currentTurn); }}
                    className="mt-4 px-6 py-2 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors uppercase text-xs tracking-widest"
                >
                    Pass Turn
                </button>
            </div>
        </div>
    );
}
