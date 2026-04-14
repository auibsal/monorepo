export interface ParsedInformationSet {
  current_turn: number;
  consecutive_passes: number;
  open_ends: [number | null, number | null];
  my_hand: { high: number; low: number }[];
  board_tiles: { high: number; low: number }[];
  opponent_counts: Record<number, number>;
}

export const parseDPN = (dpnString: string, myPlayerId: number = 1): ParsedInformationSet => {
  // Initialize standard 2v2 starting state
  const state: ParsedInformationSet = {
    current_turn: 1,
    consecutive_passes: 0,
    open_ends: [null, null],
    my_hand: [], // We'd typically inject the local player's hand state here
    board_tiles: [],
    opponent_counts: { 2: 7, 3: 7, 4: 7 } 
  };

  if (!dpnString.trim()) return state;

  // Regex to match moves like "1. [6|6] P1" or "4. PASS P4"
  const moveRegex = /(?:[0-9]+\.)\s+(PASS|\[\d\|\d\])\s+P([1-4])/g;
  let match;

  while ((match = moveRegex.exec(dpnString)) !== null) {
    const action = match[1];
    const player = parseInt(match[2], 10);

    state.current_turn = (player % 4) + 1; // Next player's turn

    if (action === "PASS") {
      state.consecutive_passes += 1;
    } else {
      state.consecutive_passes = 0; // Reset on a valid play
      
      // Extract the tile numbers, e.g., "[6|5]" -> 6 and 5
      const [high, low] = action.replace('[', '').replace(']', '').split('|').map(Number);
      state.board_tiles.push({ high, low });

      // Deduct from the opponent's tile count
      if (player !== myPlayerId && state.opponent_counts[player] > 0) {
        state.opponent_counts[player] -= 1;
      }

      // Track the open ends (simplified logic for the parser)
      if (state.board_tiles.length === 1) {
        state.open_ends = [high, low]; // First tile sets both ends
      } else {
        // Update the open ends based on what was played
        if (state.open_ends[0] === high) state.open_ends[0] = low;
        else if (state.open_ends[0] === low) state.open_ends[0] = high;
        else if (state.open_ends[1] === high) state.open_ends[1] = low;
        else if (state.open_ends[1] === low) state.open_ends[1] = high;
      }
    }
  }

  return state;
};
