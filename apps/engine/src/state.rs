use crate::bitboard::{Domino, TileSet};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GameState {
    pub hands: [TileSet; 4],
    pub unplayed_tiles: TileSet,
    pub open_ends: Option<(u8, u8)>,
    pub current_turn: usize,
    pub passed_players: [u32; 4],
    pub consecutive_passes: u32,
}

impl GameState {
    pub fn new() -> Self {
        Self {
            hands: [TileSet::empty(); 4],
            unplayed_tiles: TileSet(0x0FFFFFFF), // 28 bits set to 1
            open_ends: None,
            current_turn: 0,
            passed_players: [0; 4],
            consecutive_passes: 0,
        }
    }

    pub fn generate_legal_moves(&self) -> Vec<Domino> {
        let mut moves = Vec::with_capacity(7);
        let my_hand = &self.hands[self.current_turn];

        // Decode the Bitboard to find out what tiles are actually in the hand
        let mut all_hand_tiles = Vec::new();
        for high in 0..=6 {
            for low in 0..=high {
                let d = Domino::new(high, low);
                if my_hand.contains(&d) {
                    all_hand_tiles.push(d);
                }
            }
        }

        if let Some((end1, end2)) = self.open_ends {
            // The board is active. Filter tiles that match the open ends.
            for d in all_hand_tiles {
                if d.high == end1 || d.low == end1 || d.high == end2 || d.low == end2 {
                    moves.push(d);
                }
            }
        } else {
            // First turn of the round. Any tile in hand can be played.
            moves = all_hand_tiles;
        }

        moves
    }

    pub fn apply_move(&mut self, domino: Domino, played_on_end: u8) {
        self.hands[self.current_turn].remove(&domino);
        self.unplayed_tiles.remove(&domino);
        self.consecutive_passes = 0;

        if let Some((e1, e2)) = self.open_ends {
            let other_half = if domino.high == played_on_end { domino.low } else { domino.high };
            if e1 == played_on_end {
                self.open_ends = Some((other_half, e2));
            } else {
                self.open_ends = Some((e1, other_half));
            }
        } else {
            self.open_ends = Some((domino.high, domino.low));
        }

        self.current_turn = (self.current_turn + 1) % 4;
    }
}
