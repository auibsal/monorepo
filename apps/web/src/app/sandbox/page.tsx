'use client';

import { useState, useMemo, useEffect } from 'react';
import { DominoEngine2v2, Domino } from '@repo/core';
import DominoTile from '../../components/DominoTile';
import { calculateLinearBoard } from '../../utils/boardLayout';

export default function OfflineSandbox() {
    // Persistent instance of the engine
    const engine = useMemo(() => new DominoEngine2v2(), []);

    // React-tracked states
    const [board, setBoard] = useState<Domino[]>([]);
    const [turn, setTurn] = useState<number>(0);
    const [hands, setHands] = useState<Record<number, Domino[]>>({ 0: [], 1: [], 2: [], 3: [] });

    // Sync React state with engine on first mount
    useEffect(() => {
        setBoard([...engine.board]);
        setTurn(engine.currentTurn);
        setHands({ ...engine.hands });
    }, [engine]);

    const handlePlay = (tile: Domino, side: 'left' | 'right') => {
        const success = engine.playDomino(engine.currentTurn, tile, side);
        
        if (success) {
            // CRITICAL: We create NEW references so React triggers a re-render
            setBoard([...engine.board]); 
            setTurn(engine.currentTurn);
            setHands({
                0: [...engine.hands[0]],
                1: [...engine.hands[1]],
                2: [...engine.hands[2]],
                3: [...engine.hands[3]],
            });
        } else {
            console.warn("Move rejected by engine logic.");
        }
    };

    const handlePass = () => {
        engine.passTurn(engine.currentTurn as any);
        setTurn(engine.currentTurn);
    };

    const visualBoard = calculateLinearBoard(board);

    return (
        <div className="min-h-screen bg-black text-zinc-100 font-mono p-4 md:p-12">
            <header className="mb-12 border-b-2 border-zinc-800 pb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter uppercase">Sandbox_v1.0</h1>
                    <p className="text-zinc-500 text-xs mt-1 tracking-widest">LOCAL_AUTHORITATIVE_ENGINE_TEST</p>
                </div>
                <div className="text-right">
                    <span className="text-[10px] block text-zinc-500 uppercase">Current Turn</span>
                    <span className="text-xl font-bold text-white">PLAYER_0{turn}</span>
                </div>
            </header>

            {/* THE GAME TABLE */}
            <div className="relative w-full aspect-video bg-zinc-900/30 rounded-3xl border-2 border-zinc-800 flex items-center justify-center overflow-x-auto p-12 shadow-inner">
                <div className="flex items-center gap-1">
                    {visualBoard.length === 0 ? (
                        <div className="text-zinc-700 border-2 border-dashed border-zinc-800 p-12 text-center uppercase text-sm tracking-widest">
                            Initial State: Waiting for [6,6]
                        </div>
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

            {/* PLAYER HUD */}
            <div className="mt-12 max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                        Player 0{turn} Inventory
                    </h2>
                    <button 
                        onClick={handlePass}
                        className="text-[10px] border border-zinc-700 px-4 py-1 hover:bg-zinc-800 transition-colors uppercase"
                    >
                        Skip Turn
                    </button>
                </div>

                <div className="flex flex-wrap justify-center gap-4 bg-zinc-900/80 p-8 rounded-2xl border-2 border-zinc-800 shadow-2xl">
                    {hands[turn]?.map((tile, idx) => (
                        <div key={`${turn}-${idx}`} className="group relative">
                            <DominoTile values={tile} orientation="vertical" isReversed={false} />
                            
                            {/* ACTION OVERLAY */}
                            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-all duration-200 rounded-sm">
                                <button 
                                    onClick={() => handlePlay(tile, 'left')}
                                    className="bg-zinc-100 text-black text-[9px] font-black w-14 py-1 hover:bg-white active:scale-95"
                                >
                                    LEFT
                                </button>
                                <button 
                                    onClick={() => handlePlay(tile, 'right')}
                                    className="bg-zinc-100 text-black text-[9px] font-black w-14 py-1 hover:bg-white active:scale-95"
                                >
                                    RIGHT
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
