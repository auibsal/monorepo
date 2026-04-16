'use client';

import { useGameSocket } from '../hooks/useGameSocket';
import { Domino } from '@repo/core';
import DominoTile from './DominoTile';
import { calculateLinearBoard } from '../utils/boardLayout';

export default function GameBoard({ roomId }: { roomId: string }) {
    const { socket, gameState } = useGameSocket(roomId);

    if (!gameState) return <div className="text-white p-10">CONNECTING...</div>;

    const handlePlayTile = (domino: Domino, side: 'left' | 'right') => {
        socket?.emit('play_tile', { roomId, domino, side });
    };

    // Process the raw server array into visual data
    const visualBoard = calculateLinearBoard(gameState.board);

    return (
        <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
            {/* ... Keep your existing header ... */}

            {/* The Live Board */}
            <main className="flex-grow flex items-center justify-center p-8 overflow-x-auto relative w-full">
                <div className="flex items-center gap-1">
                    {visualBoard.length === 0 ? (
                        <div className="text-zinc-600 uppercase border border-dashed border-zinc-700 p-8">
                            Awaiting First Move ([6,6] usually starts)
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
            </main>

            {/* ... Keep your existing footer/hand component ... */}
        </div>
    );
}
