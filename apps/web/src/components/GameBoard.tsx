'use client';

import { useGameSocket } from '../hooks/useGameSocket';
import { Domino } from '@repo/core';

export default function GameBoard({ roomId }: { roomId: string }) {
    const { socket, gameState } = useGameSocket(roomId);

    if (!gameState) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-950 font-mono text-zinc-400">
                <p className="animate-pulse tracking-widest">CONNECTING_TO_MAINFRAME...</p>
            </div>
        );
    }

    const handlePlayTile = (domino: Domino, side: 'left' | 'right') => {
        socket?.emit('play_tile', { roomId, domino, side });
    };

    return (
        <div className="flex h-screen flex-col bg-zinc-950 font-mono text-zinc-100">
            {/* Top Bar: Match Info */}
            <header className="border-b-2 border-zinc-800 p-4 flex justify-between uppercase text-sm tracking-widest">
                <span>Room: {roomId}</span>
                <span>Passes: {gameState.consecutivePasses}/4</span>
            </header>

            {/* Center: The Board (The Train) */}
            <main className="flex-grow flex items-center justify-center p-8 overflow-x-auto relative">
                <div className="flex gap-1 items-center">
                    {gameState.board.length === 0 ? (
                        <div className="text-zinc-600 uppercase border border-dashed border-zinc-700 p-8">
                            Awaiting First Move
                        </div>
                    ) : (
                        gameState.board.map((domino, idx) => (
                            <div key={idx} className="flex flex-col border-2 border-zinc-300 bg-zinc-100 text-zinc-900 w-8 h-16 shadow-[4px_4px_0px_#3f3f46]">
                                <div className="flex-1 flex items-center justify-center border-b-2 border-zinc-900 font-bold">{domino[0]}</div>
                                <div className="flex-1 flex items-center justify-center font-bold">{domino[1]}</div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* Bottom: Player Hand */}
            <footer className="border-t-2 border-zinc-800 p-6 bg-zinc-900 flex flex-col items-center gap-4">
                <div className="text-xs uppercase tracking-widest text-zinc-400">Your Hand</div>
                <div className="flex gap-4">
                    {gameState.myHand.map((domino, idx) => (
                        <div key={idx} className="group relative flex flex-col items-center">
                            {/* The physical domino in hand */}
                            <div className="flex flex-col border-2 border-zinc-500 bg-zinc-800 hover:bg-zinc-700 hover:-translate-y-2 transition-transform cursor-pointer w-12 h-24 shadow-[4px_4px_0px_#000]">
                                <div className="flex-1 flex items-center justify-center border-b-2 border-zinc-900 text-lg">{domino[0]}</div>
                                <div className="flex-1 flex items-center justify-center text-lg">{domino[1]}</div>
                            </div>
                            
                            {/* Play Action Buttons (Hover State) */}
                            <div className="absolute -top-10 opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
                                <button 
                                    onClick={() => handlePlayTile(domino, 'left')}
                                    className="bg-zinc-100 text-zinc-900 text-xs px-2 py-1 font-bold shadow-[2px_2px_0px_#3f3f46] hover:bg-white"
                                >
                                    LEFT
                                </button>
                                <button 
                                    onClick={() => handlePlayTile(domino, 'right')}
                                    className="bg-zinc-100 text-zinc-900 text-xs px-2 py-1 font-bold shadow-[2px_2px_0px_#3f3f46] hover:bg-white"
                                >
                                    RIGHT
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </footer>
        </div>
    );
}
