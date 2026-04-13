use crate::bitboard::{Domino, TileSet};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GameState {
    pub hands: [TileSet; 4],         // The 4 players' hands
    pub unplayed_tiles: TileSet,     // Tiles still hidden in the game
    pub open_ends: Option<(u8, u8)>, // The two ends of the board (None if first turn)
    pub current_turn: usize,         // 0 to 3 (Player 1 to 4)
    pub passed_players: [u32; 4],    // Bitmask of numbers each player has passed on
}

impl GameState {
    /// Initializes a fresh game state
    pub fn new() -> Self {
        Self {
            hands: [TileSet::empty(); 4],
            unplayed_tiles: TileSet(0x0FFFFFFF), // 28 bits set to 1
            open_ends: None,
            current_turn: 0,
            passed_players: [0; 4],
        }
    }

    /// Generates all strictly legal moves for the current player
    pub fn generate_legal_moves(&self) -> Vec<Domino> {
        let mut moves = Vec::with_capacity(7);
        let my_hand = self.hands[self.current_turn];

        // If it's the very first move of the game, any tile in hand is legal
        if self.open_ends.is_none() {
            // In a full engine, we iterate through the bitboard to extract tiles.
            // For now, we return a mock vector to represent available tiles.
            return moves; 
        }

        let (end1, end2) = self.open_ends.unwrap();

        // Engine logic: Check which tiles in my_hand contain end1 or end2
        // (Bitwise operations will be used here to filter instantly)

        moves
    }

    /// Executes a move, updating the board ends and passing the turn
    pub fn apply_move(&mut self, domino: Domino, played_on_end: u8) {
        // 1. Remove tile from current player's hand and unplayed pool
        self.hands[self.current_turn].remove(domino);
        self.unplayed_tiles.remove(domino);

        // 2. Update the open ends
        if let Some((e1, e2)) = self.open_ends {
            let other_half = if domino.high == played_on_end { domino.low } else { domino.high };
            if e1 == played_on_end {
                self.open_ends = Some((other_half, e2));
            } else {
                self.open_ends = Some((e1, other_half));
            }
        } else {
            // First move sets both ends
            self.open_ends = Some((domino.high, domino.low));
        }

        // 3. Advance turn
        self.current_turn = (self.current_turn + 1) % 4;
    }
}
