// apps/server/src/index.ts

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createClient } from 'redis';
import { DominoEngine2v2 } from '@repo/core';
import { v4 as uuidv4 } from 'uuid'; // npm install uuid

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

// Redis Client Setup
const redis = createClient({ url: 'redis://localhost:6379' });
redis.on('error', (err) => console.log('Redis Client Error', err));
await redis.connect();

const activeGames = new Map<string, DominoEngine2v2>();
const playerSeats = new Map<string, 0 | 1 | 2 | 3>();

io.on('connection', (socket: Socket) => {
    console.log('Player connected:', socket.id);

    // --- 1. JOINING THE QUEUE ---
    socket.on('join_queue', async (payload: { userId: string, elo: number }) => {
        // Add player to a Redis List named '2v2_queue'
        // In a real app, you'd use a Sorted Set (ZADD) sorted by Elo
        await redis.rPush('2v2_queue', socket.id);
        socket.emit('queue_status', { status: 'searching' });
    });

    // --- 2. LEAVING THE QUEUE ---
    socket.on('leave_queue', async () => {
        await redis.lRem('2v2_queue', 0, socket.id);
    });

    // ... (Keep the play_tile and pass_turn logic from the previous step)
});

// --- 3. THE MATCHMAKING LOOP ---
// This runs every 3 seconds to check if we have enough players to form a match
setInterval(async () => {
    // Check how many players are in the queue
    const queueLength = await redis.lLen('2v2_queue');

    if (queueLength >= 4) {
        // Pop the first 4 players out of the queue
        const matchedSockets = [];
        for (let i = 0; i < 4; i++) {
            const socketId = await redis.lPop('2v2_queue');
            if (socketId) matchedSockets.push(socketId);
        }

        // Generate a secure room ID
        const roomId = uuidv4();
        
        // Initialize the game engine
        activeGames.set(roomId, new DominoEngine2v2());

        // Assign seats and notify the lucky 4 players
        matchedSockets.forEach((socketId, index) => {
            const seat = index as 0 | 1 | 2 | 3;
            playerSeats.set(socketId, seat);
            
            // Force the socket to join the room on the server side
            const targetSocket = io.sockets.sockets.get(socketId);
            if (targetSocket) {
                targetSocket.join(roomId);
                
                // Tell the client to redirect to the game board
                targetSocket.emit('match_found', { 
                    roomId, 
                    seat,
                    message: 'Match found! Redirecting...' 
                });
            }
        });

        console.log(`Match created: Room ${roomId} with players:`, matchedSockets);
    }
}, 3000);

httpServer.listen(3001, () => console.log('Game Server & Matchmaker running on port 3001'));
