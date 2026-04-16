import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameStateUpdate } from '@repo/core';

// Fallback to localhost if no production URL is set
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';

export const useGameSocket = (roomId: string) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [gameState, setGameState] = useState<GameStateUpdate | null>(null);

    useEffect(() => {
        // Generate a temporary fake UUID to bypass your new auth checks during testing
        const tempUserId = `test-user-${Math.floor(Math.random() * 1000)}`;

        // Initialize socket connection with auth payload
        const socketInstance = io(SERVER_URL, {
            auth: {
                userId: tempUserId
            }
        });
        
        setSocket(socketInstance);

        // Join the specific match room
        socketInstance.emit('join_game', roomId);

        // Listen for the sanitized state updates from the server
        socketInstance.on('game_state_update', (newState: GameStateUpdate) => {
            setGameState(newState);
        });

        // Cleanup on unmount
        return () => {
            socketInstance.disconnect();
        };
    }, [roomId]);

    return { socket, gameState };
};
