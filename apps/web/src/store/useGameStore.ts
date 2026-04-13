import { create } from 'zustand';

export interface Domino {
  id: string; 
  high: number;
  low: number;
}

interface GameState {
  // 4-Player 2v2 State
  hands: Record<number, Domino[]>; // Players 1 to 4
  boardTiles: Domino[];
  openEnds: [number | null, number | null];
  
  // Game Flow
  currentTurn: number; // 1, 2, 3, or 4
  consecutivePasses: number;
  gameStatus: 'waiting' | 'playing' | 'finished';
  matchResult: { winner: 'Team A' | 'Team B' | 'Draw', reason: string } | null;

  // Engine Analysis State (Restored for OracleBar)
  winProbability: number;
  analysisDepth: number;
  bestMove: [number, number] | null;
  
  // Actions
  startGame: (initialHands: Record<number, Domino[]>) => void;
  playTile: (playerId: number, tileId: string, endToPlayOn: 'left' | 'right') => void;
  passTurn: (playerId: number) => void;
  evaluateGameOver: () => void;
  updateAnalysis: (prob: number, move: [number, number], depth: number) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  hands: { 1: [], 2: [], 3: [], 4: [] },
  boardTiles: [],
  openEnds: [null, null],
  currentTurn: 1,
  consecutivePasses: 0,
  gameStatus: 'waiting',
  matchResult: null,

  // Engine Analysis Initial State
  winProbability: 0.5,
  analysisDepth: 0,
  bestMove: null,

  startGame: (initialHands) => set({
    hands: initialHands,
    boardTiles: [],
    openEnds: [null, null],
    currentTurn: 1,
    consecutivePasses: 0,
    gameStatus: 'playing',
    matchResult: null,
  }),

  playTile: (playerId, tileId, endToPlayOn) => set((state) => {
    if (state.currentTurn !== playerId || state.gameStatus !== 'playing') return state;

    const hand = state.hands[playerId];
    const tileIndex = hand.findIndex(t => t.id === tileId);
    if (tileIndex === -1) return state;

    const tile = hand[tileIndex];
    const newHand = [...hand];
    newHand.splice(tileIndex, 1);

    const newBoard = [...state.boardTiles, tile];
    const newEnds: [number | null, number | null] = [...state.openEnds];

    if (state.boardTiles.length === 0) {
      newEnds[0] = tile.high;
      newEnds[1] = tile.low;
    } else {
      const targetEnd = endToPlayOn === 'left' ? 0 : 1;
      const currentEndValue = state.openEnds[targetEnd];
      if (tile.high === currentEndValue) newEnds[targetEnd] = tile.low;
      else if (tile.low === currentEndValue) newEnds[targetEnd] = tile.high;
    }

    const nextState: Partial<GameState> = {
      hands: { ...state.hands, [playerId]: newHand },
      boardTiles: newBoard,
      openEnds: newEnds,
      currentTurn: (state.currentTurn % 4) + 1,
      consecutivePasses: 0, // Reset passes on a successful play
    };

    // Check for Domination (Empty Hand)
    if (newHand.length === 0) {
      nextState.gameStatus = 'finished';
      nextState.matchResult = { 
        winner: playerId % 2 !== 0 ? 'Team A' : 'Team B', 
        reason: 'Domination' 
      };
    }

    return nextState;
  }),

  passTurn: (playerId) => set((state) => {
    if (state.currentTurn !== playerId || state.gameStatus !== 'playing') return state;

    const passes = state.consecutivePasses + 1;
    const nextState: Partial<GameState> = {
      currentTurn: (state.currentTurn % 4) + 1,
      consecutivePasses: passes,
    };

    // Check for Block (Lock) - 4 consecutive passes
    if (passes >= 4) {
      nextState.gameStatus = 'finished';
      nextState.matchResult = { winner: 'Draw', reason: 'Board Locked' };
    }

    return nextState;
  }),

  evaluateGameOver: () => {}, // Utility to trigger ELO math and DPN export

  // Engine Analysis Action
  updateAnalysis: (prob, move, depth) => set({ 
    winProbability: prob, 
    bestMove: move, 
    analysisDepth: depth 
  }),
}));
