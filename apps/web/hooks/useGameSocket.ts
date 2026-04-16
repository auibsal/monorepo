
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameStateUpdate } from '@repo/core';

const SERVER_URL = 'http://localhost:3001'; // We will use env vars for production

export const useGameSocket = (roomId: string) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [gameState, setGameState] = useState<GameStateUpdate | null>(null);

    // Inside useGameSocket.ts
useEffect(() => {
    // Generate a temporary fake UUID for local testing
    const tempUserId = `test-user-${Math.floor(Math.random() * 1000)}`;

    const socketInstance = io('http://localhost:3001', {
        auth: {
            userId: tempUserId // Pass this to bypass server checks temporarily
        }
    });

    // ... rest of the socket logic

    useEffect(() => {
        // Initialize socket connection
        const socketInstance = io(SERVER_URL);
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
