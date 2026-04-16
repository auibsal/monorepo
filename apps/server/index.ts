import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { DominoEngine2v2 } from '@repo/core'; // Importing your shared logic!

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: '*' } // Update this to your Next.js URL in production
});

// Initialize a game instance in memory
const activeGames = new Map<string, DominoEngine2v2>();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_game', (roomId) => {
        socket.join(roomId);
        if (!activeGames.has(roomId)) {
            activeGames.set(roomId, new DominoEngine2v2());
        }
        console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

httpServer.listen(3001, () => {
    console.log('Game Server running on port 3001');
});
