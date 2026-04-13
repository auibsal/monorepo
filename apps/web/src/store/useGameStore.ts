import { create } from 'zustand';

export interface Domino {
  id: string; // e.g., "6-4"
  high: number;
  low: number;
}

interface GameState {
  playerHand: Domino[];
  boardTiles: Domino[];
  openEnds: [number | null, number | null]; // Left and Right open ends
  
  // Actions
  initializeHand: (tiles: Domino[]) => void;
  playTile: (tileId: string, endToPlayOn: 'left' | 'right') => void;
}

export const useGameStore = create<GameState>((set) => ({
  playerHand: [
    { id: '6-6', high: 6, low: 6 },
    { id: '6-4', high: 6, low: 4 },
    { id: '3-2', high: 3, low: 2 },
    { id: '5-0', high: 5, low: 0 },
    { id: '4-4', high: 4, low: 4 },
  ], // Mock starting hand
  boardTiles: [],
  openEnds: [null, null],

  initializeHand: (tiles) => set({ playerHand: tiles }),

  playTile: (tileId, endToPlayOn) => set((state) => {
    const tileIndex = state.playerHand.findIndex(t => t.id === tileId);
    if (tileIndex === -1) return state;

    const tile = state.playerHand[tileIndex];
    const newHand = [...state.playerHand];
    newHand.splice(tileIndex, 1); // Remove from hand

    const newBoard = [...state.boardTiles, tile];
    const newEnds: [number | null, number | null] = [...state.openEnds];

    // Logic to calculate the new open ends
    if (state.boardTiles.length === 0) {
      // First move of the game
      newEnds[0] = tile.high;
      newEnds[1] = tile.low;
    } else {
      const targetEnd = endToPlayOn === 'left' ? 0 : 1;
      const currentEndValue = state.openEnds[targetEnd];
      
      if (tile.high === currentEndValue) {
        newEnds[targetEnd] = tile.low;
      } else if (tile.low === currentEndValue) {
        newEnds[targetEnd] = tile.high;
      }
    }

    return {
      playerHand: newHand,
      boardTiles: newBoard,
      openEnds: newEnds
    };
  })
}));
