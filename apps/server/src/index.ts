// apps/server/src/index.ts

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createClient } from 'redis';
import { DominoEngine2v2 } from '@repo/core';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// 1. Production CORS Lockdown
const io = new Server(httpServer, { 
    cors: { 
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ["GET", "POST"],
        credentials: true
    } 
});

// 2. Secure Upstash Connection
// Upstash requires TLS, so the URL must start with 'rediss://' (note the double 's')
const redis = createClient({ 
    url: process.env.UPSTASH_REDIS_URL 
});

redis.on('error', (err) => console.error('Upstash Redis Error:', err));
redis.on('connect', () => console.log('Connected to Upstash Production Redis'));

await redis.connect();

const activeGames = new Map<string, DominoEngine2v2>();
const playerSeats = new Map<string, 0 | 1 | 2 | 3>();

// ... (Keep all the socket.io logic and matchmaking loop from the previous step exactly as is) ...

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Production Game Server running on port ${PORT}`);
});
