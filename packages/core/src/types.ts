// packages/core/src/types.ts

export type Domino = [number, number];
export type PlayerPosition = 0 | 1 | 2 | 3;

// What the Client sends to the Server
export interface PlayTilePayload {
    roomId: string;
    domino: Domino;
    side: 'left' | 'right';
}

export interface PassTurnPayload {
    roomId: string;
}

// What the Server broadcasts to the Clients
export interface GameStateUpdate {
    board: Domino[];
    leftEnd: number | null;
    rightEnd: number | null;
    currentTurn: PlayerPosition;
    myHand: Domino[]; // Only contains the receiving player's hand!
    enemyHandCounts: Record<PlayerPosition, number>; // e.g., { 0: 6, 1: 7, 2: 7, 3: 6 }
    consecutivePasses: number;
}
