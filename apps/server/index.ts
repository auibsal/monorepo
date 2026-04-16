// apps/server/src/index.ts

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { DominoEngine2v2, PlayTilePayload, PassTurnPayload, GameStateUpdate, PlayerPosition } from '@repo/core';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

// In-memory store (We will replace this with Redis later)
const activeGames = new Map<string, DominoEngine2v2>();

// Mapping Socket IDs to their PlayerPosition (0, 1, 2, or 3)
const playerSeats = new Map<string, PlayerPosition>();

io.on('connection', (socket: Socket) => {
    
    // --- 1. HANDLING A MOVE ---
    socket.on('play_tile', (payload: PlayTilePayload) => {
        const game = activeGames.get(payload.roomId);
        const seat = playerSeats.get(socket.id);

        if (!game || seat === undefined) return; // Ignore if game or player doesn't exist

        // The Engine does the heavy lifting: checks if it's their turn AND if the move is legal
        const isValid = game.playDomino(seat, payload.domino, payload.side);

        if (isValid) {
            // If valid, tell EVERYONE in the room what the new board looks like
            broadcastGameState(payload.roomId, game);
            
            // Check for win condition here...
            if (game.hands[seat].length === 0) {
                handleGameEnd(payload.roomId, game, seat);
            }
        } else {
            // Inform the cheater/laggy client that their move was rejected
            socket.emit('move_rejected', { reason: 'Invalid move or not your turn' });
        }
    });

    // --- 2. HANDLING A PASS ---
    socket.on('pass_turn', (payload: PassTurnPayload) => {
        const game = activeGames.get(payload.roomId);
        const seat = playerSeats.get(socket.id);

        if (!game || seat === undefined) return;

        const isValidPass = game.passTurn(seat);

        if (isValidPass) {
            broadcastGameState(payload.roomId, game);
            
            if (game.consecutivePasses >= 4) {
                handleBlockedGame(payload.roomId, game);
            }
        } else {
            socket.emit('move_rejected', { reason: 'You have a valid move available!' });
        }
    });
});

// --- HELPER: BROADCASTING SANITIZED STATE ---
function broadcastGameState(roomId: string, game: DominoEngine2v2) {
    const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
    if (!socketsInRoom) return;

    for (const socketId of socketsInRoom) {
        const seat = playerSeats.get(socketId);
        if (seat === undefined) continue;

        // Construct the sanitized payload (HIDING enemy hands)
        const update: GameStateUpdate = {
            board: game.board,
            leftEnd: game.leftEnd,
            rightEnd: game.rightEnd,
            currentTurn: game.currentTurn,
            myHand: game.hands[seat], // Only give them THEIR hand
            enemyHandCounts: {
                0: game.hands[0].length,
                1: game.hands[1].length,
                2: game.hands[2].length,
                3: game.hands[3].length,
            },
            consecutivePasses: game.consecutivePasses
        };

        // Send this specific payload only to this specific socket
        io.to(socketId).emit('game_state_update', update);
    }
}

// Stubs for your Rust/WASM engine handoff
function handleGameEnd(roomId: string, game: DominoEngine2v2, winningSeat: PlayerPosition) {
    console.log(`Game over! Seat ${winningSeat} dominos! Sending to Analysis Engine...`);
}

function handleBlockedGame(roomId: string, game: DominoEngine2v2) {
    console.log(`Game blocked! Calculating pips... Sending to Analysis Engine...`);
}

httpServer.listen(3001, () => console.log('Game Server running on port 3001'));
